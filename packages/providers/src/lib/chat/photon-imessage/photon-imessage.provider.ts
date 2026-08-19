import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import {
  CardElement,
  ChannelTypeEnum,
  IChatOptions,
  IChatProvider,
  IChatRenderResult,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import Axios, { AxiosError, AxiosInstance } from 'axios';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { cardToPhotonMarkdown } from './card-render.utils';
import { IPhotonUserResponse } from './types/photon-imessage.types';

const DEFAULT_SPECTRUM_URL = 'https://spectrum.photon.codes';

// Shared-user creation is idempotent per phone number, so the cache only
// saves an HTTP round-trip; a stale entry is harmless.
const ENSURED_RECIPIENT_TTL_MS = 60 * 60 * 1000;
const ENSURED_RECIPIENT_CACHE_LIMIT = 10_000;

// Spectrum apps hold live gRPC channels + token renewal; keep one per project
// and evict after idle so a worker with many tenants doesn't accumulate them.
const SPECTRUM_APP_IDLE_TTL_MS = 10 * 60 * 1000;

// Last sent message per recipient, kept so a follow-up send can reply-thread
// to it (`replyToLast` provider override). Process-local by design: a cache
// miss degrades to a plain send.
const LAST_MESSAGE_TTL_MS = 24 * 60 * 60 * 1000;
const LAST_MESSAGE_CACHE_LIMIT = 10_000;

/** Provider overrides accepted on the chat step (`providers['photon-imessage']`). */
interface IPhotonSendOverrides {
  text?: string;
  /**
   * iMessage expressive effect: a friendly name (`confetti`, `fireworks`,
   * `slam`, `invisible`, …) or a raw `com.apple.…` effect id.
   */
  effect?: string;
  /** Attachment URLs (or a single URL) sent alongside the message. */
  attachments?: string[] | string;
  /** Audio URL sent as a native iMessage voice note (waveform bubble). */
  voice?: string;
  /** Reply-thread this send to the previous message sent to this recipient. */
  replyToLast?: boolean;
  /** Force `markdown` (native styled text) or `text` for the body. */
  format?: 'markdown' | 'text';
}

/*
 * Outbound iMessage sends MUST go through spectrum-ts: the shared line is
 * served over gRPC at imessage.spectrum.photon.codes with a LightAuth token
 * audience the public HTTP transcoder does not accept, and dedicated lines
 * need per-instance routing — both of which the SDK handles natively.
 */
interface SpectrumSpace {
  send(...content: unknown[]): Promise<unknown>;
}

interface SpectrumImessage {
  user(address: string): Promise<unknown>;
  space: { create(user: unknown): Promise<SpectrumSpace> };
}

interface SpectrumBuilders {
  markdown(source: string): unknown;
  attachment(input: string, options?: Record<string, unknown>): unknown;
  voice(input: string, options?: Record<string, unknown>): unknown;
  reply(content: unknown, target: unknown): unknown;
  effect(content: unknown, effectValue: string): unknown;
  /** Friendly effect name → `com.apple.…` id (from `imessage.effect.message`). */
  effectMap: Record<string, string>;
}

interface SpectrumHandle {
  app: { stop(): Promise<void> };
  im: SpectrumImessage;
  builders: SpectrumBuilders;
  lastUsedAt: number;
}

/*
 * spectrum-ts is ESM-only while this package compiles to CJS, where tsc turns
 * `import()` into `require()`. The Function constructor keeps a genuine
 * dynamic import at runtime (same technique as the API's esm-import util).
 *
 * The function body is deliberately NOT textually identical to other
 * `new Function` importers in the monorepo: V8 dedupes identically-sourced
 * dynamic functions in its compilation cache, and the reused compilation
 * keeps the FIRST caller's import referrer — which silently rebases other
 * packages' dynamic imports onto this package's node_modules.
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const nativeEsmImport = new Function(
  'photonSpecifier',
  'return import(/* photon-imessage esm importer */ photonSpecifier)'
) as (specifier: string) => Promise<Record<string, unknown>>;

let spectrumImport = nativeEsmImport;

/** Test seam: swap the ESM importer for a fake spectrum-ts module graph. */
export const __setPhotonSpectrumImportForTests = (importer?: typeof nativeEsmImport) => {
  spectrumImport = importer ?? nativeEsmImport;
};

interface EnsuredRecipient {
  ensuredAt: number;
  /** The shared-pool number Photon allocated for this recipient — the number they must text to opt in. */
  assignedPhoneNumber?: string;
}

interface LastSentMessage {
  message: { id: string };
  storedAt: number;
}

// Module-level: the chat factory constructs a fresh provider instance per send.
const spectrumApps = new Map<string, Promise<SpectrumHandle>>();
const ensuredRecipients = new Map<string, EnsuredRecipient>();
const lastMessages = new Map<string, LastSentMessage>();

export const clearPhotonImessageCaches = () => {
  for (const pending of spectrumApps.values()) {
    pending.then((handle) => handle.app.stop()).catch(() => {});
  }
  spectrumApps.clear();
  ensuredRecipients.clear();
  lastMessages.clear();
};

function evictIdleSpectrumApps() {
  const now = Date.now();
  for (const [projectId, pending] of spectrumApps.entries()) {
    pending
      .then((handle) => {
        if (now - handle.lastUsedAt > SPECTRUM_APP_IDLE_TTL_MS && spectrumApps.get(projectId) === pending) {
          spectrumApps.delete(projectId);
          handle.app.stop().catch(() => {});
        }
      })
      .catch(() => {});
  }
}

const extractPhotonError = (error: unknown): { code?: string; message?: string } => {
  const data = (error as AxiosError)?.response?.data as { code?: string; message?: string } | undefined;
  if (data && (data.code || data.message)) return data;
  if (error instanceof Error) return { message: error.message };

  return {};
};

export class PhotonImessageChatProvider extends BaseProvider implements IChatProvider {
  id = ChatProviderIdEnum.PhotonImessage;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;

  private readonly axiosClient: AxiosInstance;
  private readonly spectrumUrl: string;

  constructor(
    private config: {
      projectId: string;
      projectSecret: string;
      /** `whsec_…` Standard Webhooks secret for the delivery-status webhook (configurations.inboundWebhookSigningKey). */
      webhookSigningKey?: string;
      spectrumUrl?: string;
    }
  ) {
    super();
    this.spectrumUrl = config.spectrumUrl ?? process.env.PHOTON_SPECTRUM_URL ?? DEFAULT_SPECTRUM_URL;
    this.axiosClient = Axios.create({
      auth: {
        username: this.config.projectId,
        password: this.config.projectSecret,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Rich Chat: iMessage via Photon renders markdown natively (spectrum-ts
   * `markdown()` content), so cards keep real bold/links/structure instead of
   * degrading to plain text. `nativePayload.format` tells `sendMessage` to
   * send the resolved content through the markdown builder.
   */
  async render(card: CardElement): Promise<IChatRenderResult> {
    return {
      nativePayload: { format: 'markdown' },
      content: cardToPhotonMarkdown(card),
      validation: [],
    };
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.PHONE)) {
      throw new Error('Invalid channel data for Photon iMessage provider');
    }

    const { phoneNumber } = options.channelData.endpoint;

    const assignedPhoneNumber = await this.ensureSharedRecipient(phoneNumber);

    const overrides = this.transform(bridgeProviderData, { text: options.content }).body as IPhotonSendOverrides;
    const text = typeof overrides.text === 'string' && overrides.text.length > 0 ? overrides.text : options.content;

    let sentMessage: { id: string } | undefined;
    try {
      const handle = await this.getSpectrumHandle();
      const contents = this.composeContents(handle.builders, text, overrides, phoneNumber);

      const user = await handle.im.user(phoneNumber);
      const space = await handle.im.space.create(user);
      const result = contents.length === 1 ? await space.send(contents[0]) : await space.send(...contents);

      sentMessage = this.resolveSentMessage(result);
    } catch (error) {
      this.throwPhotonSendError(error, phoneNumber, assignedPhoneNumber);
    }

    if (sentMessage) {
      this.rememberLastMessage(phoneNumber, sentMessage);
    }

    return {
      id: sentMessage?.id ?? randomUUID(),
      date: new Date().toISOString(),
    };
  }

  /**
   * Builds the spectrum content list for one send: styled/plain body,
   * optionally wrapped in an expressive effect and/or reply-threaded to the
   * previous message, followed by attachments and a voice note.
   */
  private composeContents(
    builders: SpectrumBuilders,
    text: string,
    overrides: IPhotonSendOverrides,
    phoneNumber: string
  ): unknown[] {
    const contents: unknown[] = [];

    // Markdown by default: iMessage renders it as native styled text and
    // plain text passes through the markdown pipeline unchanged, so step
    // bodies with bold/links just work. `format: 'text'` opts out.
    const useMarkdown = overrides.format !== 'text';

    if (text.trim().length > 0) {
      let primary: unknown = useMarkdown ? builders.markdown(text) : text;

      if (overrides.effect) {
        primary = builders.effect(primary, builders.effectMap[overrides.effect] ?? overrides.effect);
      }

      if (overrides.replyToLast) {
        const last = lastMessages.get(this.lastMessageKey(phoneNumber));
        if (last && Date.now() - last.storedAt < LAST_MESSAGE_TTL_MS) {
          primary = builders.reply(primary, last.message);
        }
      }

      contents.push(primary);
    }

    const attachments =
      typeof overrides.attachments === 'string' ? [overrides.attachments] : (overrides.attachments ?? []);
    for (const attachmentUrl of attachments) {
      if (typeof attachmentUrl === 'string' && attachmentUrl.length > 0) {
        contents.push(builders.attachment(attachmentUrl));
      }
    }

    if (typeof overrides.voice === 'string' && overrides.voice.length > 0) {
      contents.push(builders.voice(overrides.voice));
    }

    if (contents.length === 0) {
      throw new Error('Photon iMessage send requires non-empty text, an attachment, or a voice note');
    }

    return contents;
  }

  private resolveSentMessage(result: unknown): { id: string } | undefined {
    const first = Array.isArray(result) ? result[0] : result;
    if (first && typeof (first as { id?: unknown }).id === 'string') {
      return first as { id: string };
    }

    return undefined;
  }

  private lastMessageKey(phoneNumber: string): string {
    return `${this.config.projectId}:${phoneNumber}`;
  }

  private rememberLastMessage(phoneNumber: string, message: { id: string }) {
    if (lastMessages.size >= LAST_MESSAGE_CACHE_LIMIT) {
      lastMessages.clear();
    }
    lastMessages.set(this.lastMessageKey(phoneNumber), { message, storedAt: Date.now() });
  }

  private throwPhotonSendError(error: unknown, phoneNumber: string, assignedPhoneNumber?: string): never {
    const raw = error instanceof Error ? error.message : String(error);
    const details =
      typeof (error as { details?: unknown })?.details === 'string' ? (error as { details: string }).details : '';
    const combined = `${raw} ${details}`.toLowerCase();

    /*
     * Shared-line eligibility: the recipient must have texted their assigned
     * Photon number (or accepted an invite) before outbound sends succeed.
     * The proxy surfaces this as gRPC PERMISSION_DENIED.
     */
    if (
      combined.includes('permission_denied') ||
      combined.includes('permission denied') ||
      combined.includes('target not allowed')
    ) {
      const optInTarget = assignedPhoneNumber
        ? `text ${assignedPhoneNumber} (their assigned Photon number)`
        : 'text their assigned Photon number';
      throw new Error(
        `${phoneNumber} must ${optInTarget} once, or accept an invite, before this project can message them.`
      );
    }
    if (combined.includes('resource_exhausted') || combined.includes('resource exhausted')) {
      throw new Error(`Photon shared-user limit reached for your plan. (${raw})`);
    }

    /*
     * Token/credential failures can outlive a cached app (e.g. a rotated
     * project secret); drop the app so the next send rebuilds it.
     */
    if (
      combined.includes('unauthenticated') ||
      combined.includes('invalid token') ||
      combined.includes('invalid credentials')
    ) {
      spectrumApps.delete(this.config.projectId);
      throw new Error(`Photon rejected the project credentials for this send. (${raw})`);
    }

    throw new Error(raw || 'Photon failed to send the message');
  }

  private async getSpectrumHandle(): Promise<SpectrumHandle> {
    evictIdleSpectrumApps();

    const cacheKey = this.config.projectId;
    let pending = spectrumApps.get(cacheKey);

    if (!pending) {
      pending = this.buildSpectrumHandle().catch((error) => {
        // A failed boot must not poison the cache for subsequent sends.
        if (spectrumApps.get(cacheKey) === pending) {
          spectrumApps.delete(cacheKey);
        }
        throw error;
      });
      spectrumApps.set(cacheKey, pending);
    }

    const handle = await pending;
    handle.lastUsedAt = Date.now();

    return handle;
  }

  private async buildSpectrumHandle(): Promise<SpectrumHandle> {
    const [core, provider] = await Promise.all([
      spectrumImport('spectrum-ts'),
      spectrumImport('spectrum-ts/providers/imessage'),
    ]);

    const spectrumFactory = core.Spectrum as (config: Record<string, unknown>) => Promise<SpectrumHandle['app']>;
    const imessage = provider.imessage as {
      (app: SpectrumHandle['app']): SpectrumImessage;
      config(): unknown;
      effect?: { message?: Record<string, string> };
    };

    const app = await spectrumFactory({
      projectId: this.config.projectId,
      projectSecret: this.config.projectSecret,
      providers: [imessage.config()],
      telemetry: false,
      options: { logLevel: 'silent' },
    });

    const builders: SpectrumBuilders = {
      markdown: core.markdown as SpectrumBuilders['markdown'],
      attachment: core.attachment as SpectrumBuilders['attachment'],
      voice: core.voice as SpectrumBuilders['voice'],
      reply: core.reply as SpectrumBuilders['reply'],
      effect: provider.effect as SpectrumBuilders['effect'],
      effectMap: imessage.effect?.message ?? {},
    };

    return { app, im: imessage(app), builders, lastUsedAt: Date.now() };
  }

  /**
   * Registers the Novu inbound delivery webhook on the Photon project so
   * delivered/read receipts flow back. Photon issues the `whsec_` Standard
   * Webhooks secret once, at registration — it is returned via
   * `configurations.inboundWebhookSigningKey` and persisted on the
   * integration by the auto-configure usecase.
   */
  async autoConfigureInboundWebhook(configurations: { webhookUrl: string }): Promise<{
    success: boolean;
    message?: string;
    configurations?: Record<string, unknown>;
  }> {
    const webhooksUrl = `${this.spectrumUrl}/projects/${this.config.projectId}/webhooks`;

    try {
      // Replace a stale registration of this exact URL (Photon 409s on duplicates,
      // and the signing secret of the old registration is unrecoverable anyway).
      const { data: listResponse } = await this.axiosClient.get<{
        succeed: boolean;
        data: Array<{ id: string; webhookUrl: string }> | null;
      }>(webhooksUrl);
      const stale = (listResponse?.data ?? []).filter((entry) => entry.webhookUrl === configurations.webhookUrl);
      for (const entry of stale) {
        await this.axiosClient.delete(`${webhooksUrl}/${entry.id}`);
      }

      const { data: createResponse } = await this.axiosClient.post<{
        succeed: boolean;
        data: { id: string; standardSigningSecret: string } | null;
        message?: string;
        code?: string;
      }>(webhooksUrl, {
        webhookUrl: configurations.webhookUrl,
        schemaVersion: 'normalized-events.v1',
      });

      if (!createResponse?.succeed || !createResponse.data?.standardSigningSecret) {
        throw new Error(createResponse?.message ?? createResponse?.code ?? 'Photon rejected the webhook registration');
      }

      return {
        success: true,
        configurations: {
          inboundWebhookEnabled: true,
          inboundWebhookSigningKey: createResponse.data.standardSigningSecret,
        },
      };
    } catch (error) {
      const { code, message } = extractPhotonError(error);

      return {
        success: false,
        message: `Photon could not register the delivery webhook: ${message ?? code ?? 'unknown error'}`,
      };
    }
  }

  /**
   * Verifies a Photon (Spectrum Cloud) delivery against the Standard Webhooks
   * signature headers. Mirrors other providers' behavior when no signing key
   * is configured: pass, so manual setups without a stored secret keep working.
   */
  async verifySignature({
    rawBody,
    headers,
  }: {
    rawBody: unknown;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }): Promise<{ success: boolean; message?: string }> {
    const signingKey = this.config.webhookSigningKey?.trim();
    if (!signingKey) {
      return { success: true, message: 'Webhook signing key not configured; skipping signature verification' };
    }

    const normalizedHeaders = Object.fromEntries(
      Object.entries(headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])
    );
    const webhookId = normalizedHeaders['webhook-id'];
    const timestamp = normalizedHeaders['webhook-timestamp'];
    const signatureHeader = normalizedHeaders['webhook-signature'];

    if (!webhookId || !timestamp || !signatureHeader) {
      return { success: false, message: 'Missing Standard Webhooks headers' };
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) {
      return { success: false, message: 'Stale or malformed webhook timestamp' };
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : (rawBody as Buffer | undefined)?.toString('utf8');
    if (typeof bodyString !== 'string') {
      return { success: false, message: 'Missing raw body for signature verification' };
    }

    const key = Buffer.from(signingKey.replace(/^whsec_/, ''), 'base64');
    const expected = Buffer.from(
      createHmac('sha256', key).update(`${webhookId}.${timestamp}.${bodyString}`).digest('base64')
    );

    const verified = signatureHeader.split(' ').some((entry) => {
      const [version, signature] = entry.split(',');
      if (version !== 'v1' || !signature) return false;
      const candidate = Buffer.from(signature);

      return candidate.length === expected.length && timingSafeEqual(candidate, expected);
    });

    return verified ? { success: true } : { success: false, message: 'Invalid webhook signature' };
  }

  /**
   * Delivery-status correlation for the inbound-webhook pipeline. Two signals
   * carry a message id that matches what `sendMessage` returned (persisted on
   * `MessageEntity.identifier` by the worker):
   * - an outbound echo (`direction: 'outbound'`) → the line accepted/delivered our send
   * - a read receipt (`content.type: 'read'`) → its `target` is our outbound message
   * Inbound user texts return no ids and are skipped by the pipeline.
   */
  getMessageId(body: unknown): string[] {
    const message = this.parseWebhookMessage(body);
    if (!message) return [];

    if (message.content?.type === 'read') {
      const targetId = (message.content as { target?: { id?: unknown } }).target?.id;

      return typeof targetId === 'string' ? [targetId] : [];
    }

    if (message.direction === 'outbound' && typeof message.id === 'string') {
      return [message.id];
    }

    return [];
  }

  parseEventBody(body: unknown, identifier: string): unknown | undefined {
    const message = this.parseWebhookMessage(body);
    if (!message) return undefined;

    const date = typeof message.timestamp === 'string' ? message.timestamp : new Date().toISOString();
    const row = JSON.stringify(message);

    // iMessage read receipts are conversation-level ("read up to"), surfaced per target message.
    if (message.content?.type === 'read') {
      return { status: 'opened', date, externalId: identifier, row };
    }

    if (message.direction === 'outbound') {
      return { status: 'delivered', date, externalId: identifier, row };
    }

    return undefined;
  }

  private parseWebhookMessage(body: unknown):
    | {
        id?: unknown;
        direction?: unknown;
        timestamp?: unknown;
        content?: { type?: unknown; target?: unknown };
      }
    | undefined {
    let payload: unknown = body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        return undefined;
      }
    }

    const envelope = payload as { event?: unknown; message?: Record<string, unknown> } | undefined;
    if (envelope?.event !== 'messages' || !envelope.message || typeof envelope.message !== 'object') {
      return undefined;
    }

    return envelope.message as ReturnType<PhotonImessageChatProvider['parseWebhookMessage']>;
  }

  /**
   * Registers the recipient on the project's shared iMessage line (idempotent
   * per phone). When an email is supplied, Photon also sends the recipient an
   * opt-in invite — re-registration updates the email idempotently, and
   * Photon rate-limits invites to one per user per 24h, so passing it on
   * every send is safe. A cached entry is refreshed when an email becomes
   * available so the invite still goes out.
   */
  private async ensureSharedRecipient(phoneNumber: string): Promise<string | undefined> {
    const cacheKey = `${this.config.projectId}:${phoneNumber}`;
    const cached = ensuredRecipients.get(cacheKey);
    if (cached && Date.now() - cached.ensuredAt < ENSURED_RECIPIENT_TTL_MS) {
      return cached.assignedPhoneNumber;
    }

    let assignedPhoneNumber: string | undefined;
    try {
      const { data } = await this.axiosClient.post<IPhotonUserResponse>(
        `${this.spectrumUrl}/projects/${this.config.projectId}/users`,
        { type: 'shared', phoneNumber }
      );
      if (data?.succeed === false) {
        throw new Error(data.message ?? data.code ?? 'Photon rejected the shared user');
      }
      assignedPhoneNumber = data?.data?.assignedPhoneNumber;
    } catch (error) {
      const { code, message } = extractPhotonError(error);
      throw new Error(
        `Photon could not register recipient ${phoneNumber} on the shared iMessage line: ${message ?? code ?? 'unknown error'}`
      );
    }

    if (ensuredRecipients.size >= ENSURED_RECIPIENT_CACHE_LIMIT) {
      ensuredRecipients.clear();
    }
    ensuredRecipients.set(cacheKey, { ensuredAt: Date.now(), assignedPhoneNumber });

    return assignedPhoneNumber;
  }
}
