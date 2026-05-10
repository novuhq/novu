import * as dns from 'node:dns';
import * as http from 'node:http';
import * as https from 'node:https';
import { BadGatewayException, BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  assertSafeOutboundUrl,
  CacheService,
  decryptCredentials,
  isPrivateIp,
  MailFactory,
  PinoLogger,
  SsrfBlockedError,
} from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import type { SentMessageInfo } from '@novu/framework';
import { ChannelTypeEnum, EmailProviderIdEnum, type IEmailOptions } from '@novu/shared';
import type { AdapterPostableMessage, Chat, EmojiValue, Message, ReactionEvent, Thread } from 'chat';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { LRUCache } from 'lru-cache';
import { AgentEventEnum } from '../dtos/agent-event.enum';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import type { FileRef, ReplyContentDto } from '../dtos/agent-reply-payload.dto';
import { esmImport } from '../utils/esm-import';
import { sendWebResponse, toWebRequest } from '../utils/express-to-web-request';
import { AgentConfigResolver, ResolvedAgentConfig } from './agent-config-resolver.service';
import { AgentInboundHandler } from './agent-inbound-handler.service';

function getErrorResponseBody(err: unknown): unknown {
  if (!err || typeof err !== 'object') {
    return undefined;
  }

  return (err as { response?: { body?: unknown } }).response?.body;
}

function getDeliveryErrorDetail(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const responseBody = body as { errors?: Array<{ message?: unknown }>; message?: unknown };
  const firstErrorMessage = responseBody.errors?.[0]?.message;
  if (typeof firstErrorMessage === 'string') {
    return firstErrorMessage;
  }

  return typeof responseBody.message === 'string' ? responseBody.message : undefined;
}

function toDeliveryError(err: unknown): never {
  const base = err instanceof Error ? err.message : String(err);
  const detail = getDeliveryErrorDetail(getErrorResponseBody(err));

  throw new BadGatewayException({
    error: 'delivery_failed',
    message: detail ? `${base}: ${detail}` : base,
  });
}

/** Ensure a Message-ID value is wrapped in RFC 5322 angle brackets. */
function wrapMsgId(id: string): string {
  const trimmed = id.trim();

  return trimmed.startsWith('<') && trimmed.endsWith('>') ? trimmed : `<${trimmed}>`;
}

/**
 * ICredentials field mapping per platform adapter:
 *
 * Slack:    credentials.signingSecret   → signingSecret
 *           connection.auth.accessToken → botToken
 *
 * Teams:    credentials.clientId  → appId
 *           credentials.secretKey → appPassword
 *           credentials.tenantId  → appTenantId
 *
 * WhatsApp: credentials.apiToken                  → accessToken
 *           credentials.secretKey                → appSecret
 *           credentials.token                    → verifyToken
 *           credentials.phoneNumberIdentification → phoneNumberId
 */

const MAX_CACHED_INSTANCES = 200;
const INSTANCE_TTL_MS = 1000 * 60 * 30;
const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;
const MAX_INLINE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_INLINE_AGGREGATE_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES_PER_MESSAGE = 15;
const MAX_AGGREGATE_FILE_BYTES = 50 * 1024 * 1024;
const MAX_INLINE_FILE_BASE64_CHARS = 7_000_000;
const FILE_FETCH_TIMEOUT_MS = 10_000;
const MAX_FILE_FETCH_REDIRECTS = 3;
const SUPPORTED_FILE_PLATFORMS = new Set<string>([AgentPlatformEnum.SLACK, AgentPlatformEnum.TEAMS]);
const UNSUPPORTED_FILE_PLATFORMS = new Set<string>([AgentPlatformEnum.EMAIL, AgentPlatformEnum.WHATSAPP]);
// EMAIL_ALTERNATIVES_SUPPORTED_PROVIDERS is a deliberate allowlist for providers that preserve custom MIME
// alternatives used by Gmail reactions; Braze, Brevo, Mailgun, Mailjet, Mailtrap, Mandrill, Plunk, Postmark,
// Resend, SparkPost, and similar providers are excluded until their SDK paths are verified.
const EMAIL_ALTERNATIVES_SUPPORTED_PROVIDERS = new Set<string>([
  EmailProviderIdEnum.CustomSMTP,
  EmailProviderIdEnum.Outlook365,
  EmailProviderIdEnum.SendGrid,
  EmailProviderIdEnum.SES,
]);

/**
 * Holds a cached Chat instance alongside a mutable pointer to the current
 * resolved config. Event handlers registered via registerEventHandlers() close
 * over this box instead of the config value, so updates to fields that the
 * bridge executor and inbound handler read at event time (bridgeUrl,
 * devBridgeUrl, devBridgeActive, acknowledgeOnReceived, reactionOnResolved) take
 * effect on the next inbound event without rebuilding the Chat instance.
 *
 * adapterFingerprint captures fields that are baked into the platform adapter
 * at construction (credentials + connectionAccessToken); when these change,
 * the cached instance is dropped and rebuilt — see getOrCreate().
 */
interface CachedChat {
  chat: Chat;
  config: ResolvedAgentConfig;
  adapterFingerprint: string;
}

type ChatSdkFile = Omit<FileRef, 'data'> & { data?: Buffer };
type ChatSdkReplyContent = Omit<ReplyContentDto, 'files'> & { files?: ChatSdkFile[] };
type MaterializedFile = ChatSdkFile & { size: number; source: 'data' | 'url' };
type PinnedFileResponse = {
  status: number;
  statusText: string;
  headers: http.IncomingHttpHeaders;
  data: Buffer;
};

@Injectable()
export class ChatSdkService implements OnModuleDestroy {
  private readonly instances: LRUCache<string, CachedChat>;
  private readonly pendingCreations = new Map<string, Promise<Chat>>();

  constructor(
    private readonly logger: PinoLogger,
    private readonly cacheService: CacheService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly inboundHandler: AgentInboundHandler,
    private readonly integrationRepository: IntegrationRepository
  ) {
    this.logger.setContext(this.constructor.name);
    this.instances = new LRUCache<string, CachedChat>({
      max: MAX_CACHED_INSTANCES,
      ttl: INSTANCE_TTL_MS,
      dispose: (cached, key) => {
        cached.chat.shutdown().catch((err) => {
          this.logger.error(err, `Failed to shut down evicted Chat instance ${key}`);
        });
      },
    });
  }

  async handleWebhook(agentId: string, integrationIdentifier: string, req: ExpressRequest, res: ExpressResponse) {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const { platform } = config;
    const instanceKey = `${agentId}:${integrationIdentifier}`;

    const chat = await this.getOrCreate(instanceKey, agentId, platform, config);
    const handler = chat.webhooks[platform];
    if (!handler) {
      throw new BadRequestException(`Platform ${platform} not configured for agent ${agentId}`);
    }

    const webRequest = toWebRequest(req);
    const webResponse = await handler(webRequest);

    await sendWebResponse(webResponse, res);
  }

  async onModuleDestroy() {
    const shutdowns = [...this.instances.entries()].map(async ([key, cached]) => {
      try {
        await cached.chat.shutdown();
      } catch (err) {
        this.logger.error(err, `Failed to shut down Chat instance ${key}`);
      }
    });

    await Promise.allSettled(shutdowns);
    this.instances.clear();
  }

  async postToConversation(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    serializedThread: Record<string, unknown>,
    content: ReplyContentDto
  ): Promise<SentMessageInfo> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const { ThreadImpl } = await esmImport('chat');
    const adapter = chat.getAdapter(platform);
    const thread = ThreadImpl.fromJSON(serializedThread, adapter);
    const deliveryContent = await this.prepareContentForDelivery(content, platform, agentId);

    let postPromise: Promise<{ id: string; threadId: string }>;
    if (deliveryContent.card) {
      postPromise = thread.post(deliveryContent.card);
    } else {
      postPromise = thread.post({ markdown: deliveryContent.markdown ?? '', files: deliveryContent.files });
    }

    const sent = await postPromise.catch(toDeliveryError);

    return { messageId: sent.id, platformThreadId: sent.threadId };
  }

  async sendDirectMessage(
    agentId: string,
    integrationIdentifier: string,
    platformUserId: string,
    content: ReplyContentDto
  ): Promise<SentMessageInfo & { serializedThread: Record<string, unknown> }> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const dmThread = await chat.openDM(platformUserId);
    const deliveryContent = await this.prepareContentForDelivery(content, config.platform, agentId);

    const postArg = deliveryContent.card
      ? (deliveryContent.card as unknown as AdapterPostableMessage)
      : ({
          markdown: deliveryContent.markdown ?? '',
          files: deliveryContent.files,
        } as unknown as AdapterPostableMessage);

    const sent = await dmThread.post(postArg).catch(toDeliveryError);

    // Slack Assistant Threads return a threadId like "slack:D12345:" — append the
    // root message ts so it matches the format getInboundPlatformThreadId produces
    // when the user replies, keeping inbound and outbound on the same conversation.
    const platformThreadId = sent.threadId.endsWith(':') ? `${sent.threadId}${sent.id}` : sent.threadId;

    // DM threads opened via openDM() may not have a currentMessage, so toJSON()
    // can fail. Build a minimal serialized thread that ThreadImpl.fromJSON() can
    // reconstruct for later replies.
    const serializedThread: Record<string, unknown> = {
      id: platformThreadId,
      channelId: dmThread.channelId,
      isDM: true,
      platform: config.platform,
      currentMessage: { id: sent.id, threadId: sent.threadId },
    };

    return { messageId: sent.id, platformThreadId, serializedThread };
  }

  async editInConversation(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    content: ReplyContentDto
  ): Promise<SentMessageInfo> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    if (typeof adapter.editMessage !== 'function') {
      throw new BadRequestException(`Platform ${platform} does not support editing messages`);
    }

    const deliveryContent = await this.prepareContentForDelivery(content, platform, agentId);

    let editPromise: Promise<{ id: string; threadId: string }>;
    if (deliveryContent.card) {
      editPromise = adapter.editMessage(
        platformThreadId,
        platformMessageId,
        deliveryContent.card as unknown as AdapterPostableMessage
      );
    } else {
      editPromise = adapter.editMessage(platformThreadId, platformMessageId, {
        markdown: deliveryContent.markdown ?? '',
        files: deliveryContent.files,
      } as unknown as AdapterPostableMessage);
    }

    const edited = await editPromise.catch(toDeliveryError);

    return { messageId: edited.id, platformThreadId: edited.threadId };
  }

  private async prepareContentForDelivery(
    content: ReplyContentDto,
    platform: string = AgentPlatformEnum.SLACK,
    agentId?: string
  ): Promise<ChatSdkReplyContent> {
    if (content.card && content.files?.length) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: 'File attachments are only supported with string or markdown replies, not cards.',
      });
    }

    if (!content.files?.length) {
      return content as ChatSdkReplyContent;
    }

    if (UNSUPPORTED_FILE_PLATFORMS.has(platform)) {
      this.logger.warn(
        {
          agentId,
          platform,
          droppedCount: content.files.length,
        },
        'Dropping outbound agent files because platform does not support attachments'
      );

      const { files: _files, ...withoutFiles } = content;

      return withoutFiles as ChatSdkReplyContent;
    }

    if (!SUPPORTED_FILE_PLATFORMS.has(platform)) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `File attachments are not supported on platform "${platform}".`,
      });
    }

    if (content.files.length > MAX_FILES_PER_MESSAGE) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Too many attachments: maximum is ${MAX_FILES_PER_MESSAGE} files per message.`,
      });
    }

    const files: ChatSdkFile[] = [];
    let aggregateSize = 0;
    let inlineAggregateSize = 0;

    for (const [index, file] of content.files.entries()) {
      const materialized = await this.prepareFileForDelivery(file, index);
      aggregateSize += materialized.size;
      if (materialized.source === 'data') {
        inlineAggregateSize += materialized.size;
      }

      if (aggregateSize > MAX_AGGREGATE_FILE_BYTES) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Total attachment size exceeds ${this.formatBytes(MAX_AGGREGATE_FILE_BYTES)}.`,
        });
      }

      if (inlineAggregateSize > MAX_INLINE_AGGREGATE_FILE_BYTES) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Total inline attachment size exceeds ${this.formatBytes(MAX_INLINE_AGGREGATE_FILE_BYTES)}. Use URLs for larger files.`,
        });
      }

      const { size: _size, source: _source, ...chatSdkFile } = materialized;
      files.push(chatSdkFile);
    }

    return {
      ...content,
      files,
    };
  }

  private async prepareFileForDelivery(file: FileRef, index: number): Promise<MaterializedFile> {
    const data = (file as { data?: unknown }).data;
    const url = (file as { url?: unknown }).url;

    if (data !== undefined && data !== null) {
      if (typeof data !== 'string') {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Invalid file ${this.describeFile(file, index)}: data must be a base64-encoded string.`,
        });
      }

      const buffer = this.decodeBase64FileData(data, file, index);
      const { url: _url, ...fileWithoutUrl } = file;

      return {
        ...fileWithoutUrl,
        data: buffer,
        size: buffer.length,
        source: 'data',
      };
    }

    if (typeof url !== 'string') {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)}: provide a public HTTP(S) url or base64 data.`,
      });
    }

    const fetched = await this.fetchFileUrl(url, file, index);
    const { url: _url, ...fileWithoutUrl } = file;

    return {
      ...fileWithoutUrl,
      data: fetched.data,
      mimeType: file.mimeType || fetched.mimeType,
      size: fetched.data.length,
      source: 'url',
    };
  }

  private decodeBase64FileData(data: string, file: FileRef, index: number): Buffer {
    const normalized = data.replace(/\s/g, '');
    const remainder = normalized.length % 4;

    if (normalized.length > MAX_INLINE_FILE_BASE64_CHARS) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)}: inline data must be ${this.formatBytes(MAX_INLINE_FILE_BYTES)} or smaller.`,
      });
    }

    if (!normalized || remainder === 1 || !BASE64_REGEX.test(normalized)) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)}: data must be a base64-encoded string.`,
      });
    }

    const padded = remainder === 0 ? normalized : normalized.padEnd(normalized.length + (4 - remainder), '=');
    const buffer = Buffer.from(padded, 'base64');

    if (buffer.toString('base64').replace(/=+$/, '') !== normalized.replace(/=+$/, '')) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)}: data must be a base64-encoded string.`,
      });
    }

    if (buffer.length > MAX_INLINE_FILE_BYTES) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)}: inline data must be ${this.formatBytes(MAX_INLINE_FILE_BYTES)} or smaller.`,
      });
    }

    return buffer;
  }

  private async fetchFileUrl(url: string, file: FileRef, index: number): Promise<{ data: Buffer; mimeType?: string }> {
    const response = await this.fetchValidatedFileUrl(url, file, index);

    if (response.status < 200 || response.status >= 300) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Failed to fetch file ${this.describeFile(file, index)}: ${response.status} ${response.statusText}`,
      });
    }

    const contentLength = this.getHeader(response.headers, 'content-length');
    if (contentLength) {
      const size = Number(contentLength);
      if (Number.isFinite(size) && size > MAX_FILE_BYTES) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Invalid file ${this.describeFile(file, index)}: file size exceeds ${this.formatBytes(MAX_FILE_BYTES)}.`,
        });
      }
    }

    const data = response.data;
    const mimeType = this.getHeader(response.headers, 'content-type');

    return { data, mimeType };
  }

  private async fetchValidatedFileUrl(url: string, file: FileRef, index: number): Promise<PinnedFileResponse> {
    let currentUrl = url;

    for (let redirectCount = 0; redirectCount <= MAX_FILE_FETCH_REDIRECTS; redirectCount += 1) {
      const ssrfError = await this.validateFileUrl(currentUrl);
      if (ssrfError) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Invalid file ${this.describeFile(file, index)} url: ${ssrfError}`,
        });
      }

      let response: PinnedFileResponse;
      try {
        response = await this.requestPinnedFileUrl(currentUrl, file, index);
      } catch (err) {
        if (err instanceof BadRequestException) {
          throw err;
        }

        const message = err instanceof Error ? err.message : String(err);
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Failed to fetch file ${this.describeFile(file, index)}: ${message}`,
        });
      }

      if (response.status < 300 || response.status >= 400) {
        return response;
      }

      const location = this.getHeader(response.headers, 'location');
      if (!location) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Failed to fetch file ${this.describeFile(file, index)}: redirect response missing Location header.`,
        });
      }

      currentUrl = new URL(location, currentUrl).toString();
    }

    throw new BadRequestException({
      error: 'attachment_failed',
      message: `Failed to fetch file ${this.describeFile(file, index)}: too many redirects.`,
    });
  }

  private async validateFileUrl(url: string): Promise<string | null> {
    try {
      assertSafeOutboundUrl(url);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        return err.message;
      }
      throw err;
    }

    return null;
  }

  private async requestPinnedFileUrl(url: string, file: FileRef, index: number): Promise<PinnedFileResponse> {
    const parsed = new URL(url);
    const address = await this.resolvePublicAddress(parsed, file, index);
    const client = parsed.protocol === 'https:' ? https : http;

    return await new Promise((resolve, reject) => {
      const request = client.request(
        {
          protocol: parsed.protocol,
          hostname: address.address,
          family: address.family,
          port: parsed.port || undefined,
          path: `${parsed.pathname}${parsed.search}`,
          method: 'GET',
          headers: { Host: parsed.host },
          servername: parsed.hostname,
          timeout: FILE_FETCH_TIMEOUT_MS,
        },
        (response) => {
          const status = response.statusCode ?? 0;
          const statusText = response.statusMessage ?? '';

          if (status >= 300 && status < 400) {
            response.resume();
            resolve({ status, statusText, headers: response.headers, data: Buffer.alloc(0) });

            return;
          }

          const contentLength = this.getHeader(response.headers, 'content-length');
          if (contentLength) {
            const size = Number(contentLength);
            if (Number.isFinite(size) && size > MAX_FILE_BYTES) {
              response.destroy();
              reject(
                new BadRequestException({
                  error: 'attachment_failed',
                  message: `Invalid file ${this.describeFile(file, index)}: file size exceeds ${this.formatBytes(MAX_FILE_BYTES)}.`,
                })
              );

              return;
            }
          }

          const chunks: Buffer[] = [];
          let total = 0;

          response.on('data', (chunk: Buffer) => {
            total += chunk.length;
            if (total > MAX_FILE_BYTES) {
              response.destroy(
                new BadRequestException({
                  error: 'attachment_failed',
                  message: `Invalid file ${this.describeFile(file, index)}: file size exceeds ${this.formatBytes(MAX_FILE_BYTES)}.`,
                })
              );

              return;
            }

            chunks.push(chunk);
          });
          response.on('end', () =>
            resolve({ status, statusText, headers: response.headers, data: Buffer.concat(chunks, total) })
          );
          response.on('error', reject);
        }
      );

      request.on('timeout', () => request.destroy(new Error('Request timed out')));
      request.on('error', reject);
      request.end();
    });
  }

  private async resolvePublicAddress(parsed: URL, file: FileRef, index: number): Promise<dns.LookupAddress> {
    let addresses: dns.LookupAddress[];
    try {
      addresses = await dns.promises.lookup(parsed.hostname, { all: true });
    } catch {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)} url: Unable to resolve hostname "${parsed.hostname}".`,
      });
    }

    if (!addresses.length) {
      throw new BadRequestException({
        error: 'attachment_failed',
        message: `Invalid file ${this.describeFile(file, index)} url: Unable to resolve hostname "${parsed.hostname}".`,
      });
    }

    for (const { address } of addresses) {
      if (isPrivateIp(address)) {
        throw new BadRequestException({
          error: 'attachment_failed',
          message: `Invalid file ${this.describeFile(file, index)} url: Requests to private or reserved IP addresses are not allowed (resolved: ${address}).`,
        });
      }
    }

    return addresses[0];
  }

  private getHeader(headers: http.IncomingHttpHeaders, name: string): string | undefined {
    const value = headers[name.toLowerCase()];

    return Array.isArray(value) ? value[0] : value;
  }

  private describeFile(file: FileRef, index: number): string {
    return file.filename ? `"${file.filename}"` : `at index ${index}`;
  }

  private formatBytes(bytes: number): string {
    return `${Math.floor(bytes / (1024 * 1024))} MB`;
  }

  async removeReaction(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    emojiName: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    const resolved = await this.resolveEmoji(emojiName);
    await adapter.removeReaction(platformThreadId, platformMessageId, resolved);
  }

  async reactToMessage(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    emojiName: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    const resolved = await this.resolveEmoji(emojiName);
    await adapter.addReaction(platformThreadId, platformMessageId, resolved);
  }

  private async resolveEmoji(name: string): Promise<EmojiValue> {
    const { getEmoji } = await esmImport('chat');
    const resolved = getEmoji(name);
    if (!resolved) {
      throw new Error(`Unknown emoji name: "${name}". Use GET /agents/emoji to list supported options.`);
    }

    return resolved;
  }

  private async getOrCreate(
    instanceKey: string,
    agentId: string,
    platform: AgentPlatformEnum,
    config: ResolvedAgentConfig
  ): Promise<Chat> {
    const freshFingerprint = this.adapterFingerprint(config);
    const existing = this.instances.get(instanceKey);

    if (existing) {
      if (existing.adapterFingerprint === freshFingerprint) {
        existing.config = config;

        return existing.chat;
      }

      // Credentials / connection token changed since this instance was built —
      // the platform adapter is frozen with the old values, so we must rebuild.
      // Delete triggers the LRU dispose hook which calls chat.shutdown().
      this.instances.delete(instanceKey);
    }

    // Key pending builds by (instanceKey + fingerprint) so that a build kicked
    // off with stale credentials can't be observed by a later caller that has
    // already-rotated credentials — that caller would otherwise await the
    // in-flight promise and receive a Chat whose adapter is baked with the old
    // secrets. With this keying, concurrent callers with divergent configs
    // each get their own build; the later instances.set() wins and the LRU
    // dispose hook shuts down the superseded Chat.
    const pendingKey = `${instanceKey}:${freshFingerprint}`;
    const pending = this.pendingCreations.get(pendingKey);
    if (pending) return pending;

    const creation = this.createAndCache(instanceKey, agentId, platform, config, freshFingerprint);
    this.pendingCreations.set(pendingKey, creation);

    try {
      return await creation;
    } finally {
      this.pendingCreations.delete(pendingKey);
    }
  }

  private async createAndCache(
    instanceKey: string,
    agentId: string,
    platform: AgentPlatformEnum,
    config: ResolvedAgentConfig,
    adapterFingerprint: string
  ): Promise<Chat> {
    const chat = await this.createChatInstance(instanceKey, platform, config);
    await chat.initialize();
    const cached: CachedChat = { chat, config, adapterFingerprint };
    this.registerEventHandlers(agentId, cached);
    this.instances.set(instanceKey, cached);

    return chat;
  }

  /**
   * Fingerprint of every field baked into the Chat instance at construction
   * time — i.e. everything read by buildAdapters() and createChatInstance().
   * When the fingerprint changes, the cached instance must be rebuilt because
   * these values live inside already-constructed platform adapters and cannot
   * be mutated after the fact.
   *
   * JSON.stringify over a fixed-shape object is injective (JSON escapes rule
   * out delimiter collisions across free-form secret values), which is all we
   * need for an equality-based cache-coherence check. We deliberately do NOT
   * hash: this is not credential verification or password storage, so fast
   * hashing would be architecturally wrong and the plaintext is already
   * retained in cached.config for the entry's lifetime anyway.
   *
   * IMPORTANT: keep in sync with buildAdapters() whenever a new adapter input
   * is added. Missing a field here will cause the cache to silently serve
   * stale credentials until the LRU TTL expires.
   */
  private adapterFingerprint(config: ResolvedAgentConfig): string {
    const { platform, credentials: c, connectionAccessToken } = config;

    return JSON.stringify({
      platform,
      signingSecret: c.signingSecret ?? null,
      clientId: c.clientId ?? null,
      secretKey: c.secretKey ?? null,
      tenantId: c.tenantId ?? null,
      apiToken: c.apiToken ?? null,
      token: c.token ?? null,
      phoneNumberIdentification: c.phoneNumberIdentification ?? null,
      connectionAccessToken: connectionAccessToken ?? null,
      outboundIntegrationId: c.outboundIntegrationId ?? null,
      useFromAddressOverride: c.useFromAddressOverride ?? null,
      fromAddressOverride: c.fromAddressOverride ?? null,
    });
  }

  private buildSendEmailCallback(
    config: ResolvedAgentConfig,
    outboundIntegrationId: string | undefined
  ): (params: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    alternatives?: Array<{
      contentType: string;
      content: string | Buffer;
    }>;
    inReplyTo?: string;
    references?: string;
    messageId?: string;
  }) => Promise<{ messageId?: string }> {
    return async (params) => {
      if (!outboundIntegrationId) {
        throw new BadRequestException(
          'Email agent integration requires an outbound email provider (outboundIntegrationId). ' +
            'Configure one in the agent email setup.'
        );
      }

      const integration = await this.integrationRepository.findOne({
        _id: outboundIntegrationId,
        _environmentId: config.environmentId,
        _organizationId: config.organizationId,
        channel: ChannelTypeEnum.EMAIL,
      });

      if (!integration) {
        throw new BadRequestException(
          `Outbound email integration ${outboundIntegrationId} not found or does not belong to this environment`
        );
      }

      if (integration.providerId === EmailProviderIdEnum.NovuAgent) {
        throw new BadRequestException(
          `Integration ${outboundIntegrationId} is the inbound NovuAgent provider and cannot be used as an outbound sender`
        );
      }

      if (!integration.active) {
        throw new BadRequestException(
          `Outbound email integration ${outboundIntegrationId} (${integration.providerId}) is inactive`
        );
      }

      const hasUnsupportedAlternatives =
        params.alternatives?.length && !EMAIL_ALTERNATIVES_SUPPORTED_PROVIDERS.has(integration.providerId);
      if (hasUnsupportedAlternatives) {
        // NovuEmailAdapterImpl.addReaction supplies a reaction Message-ID; any custom MIME alternative caller must do
        // the same so skipped unsupported sends don't claim provider delivery.
        if (!params.messageId) {
          this.logger.warn(
            {
              providerId: integration.providerId,
              outboundIntegrationId,
            },
            'Skipping email with custom MIME alternatives because the outbound provider is unsupported and no messageId was supplied'
          );

          return { messageId: undefined };
        }

        this.logger.warn(
          {
            providerId: integration.providerId,
            outboundIntegrationId,
          },
          'Skipping email reaction because the outbound provider does not support custom MIME alternatives'
        );

        return { messageId: params.messageId };
      }

      const decrypted = decryptCredentials(integration.credentials);

      // The chat-adapter-email contract guarantees params.from is the agent's inbound address
      // (see packages/chat-adapter-email/src/adapter.ts postMessage/addReaction). We treat it as
      // the Reply-To target so subscriber replies still reach the agent's inbox even when the
      // outbound From is rewritten to the sending provider's configured sender (or a per-agent
      // override). When neither override nor outbound.from is set, we fall back to the agent
      // address for From and skip Reply-To — preserving the legacy behavior.
      const agentInboundAddress = params.from;
      const overrideFrom = config.credentials.useFromAddressOverride
        ? config.credentials.fromAddressOverride?.trim() || undefined
        : undefined;
      const outboundFrom = (decrypted.from as string | undefined)?.trim() || undefined;
      const effectiveFrom = overrideFrom || outboundFrom || agentInboundAddress;
      const replyToHeader = effectiveFrom !== agentInboundAddress ? agentInboundAddress : undefined;

      const mailFactory = new MailFactory();
      const handler = mailFactory.getHandler({ ...integration, credentials: decrypted }, effectiveFrom);

      const mailOptions: IEmailOptions = {
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        alternatives: params.alternatives,
        from: effectiveFrom,
        ...(replyToHeader ? { replyTo: replyToHeader } : {}),
        senderName: config.credentials.senderName || undefined,
        headers: {
          ...(params.messageId ? { 'Message-ID': wrapMsgId(params.messageId) } : {}),
          ...(params.inReplyTo ? { 'In-Reply-To': wrapMsgId(params.inReplyTo) } : {}),
          ...(params.references
            ? { References: params.references.split(/\s+/).filter(Boolean).map(wrapMsgId).join(' ') }
            : {}),
        },
      };

      const result = await handler.send(mailOptions).catch(toDeliveryError);

      return { messageId: result?.id || params.messageId || '' };
    };
  }

  private async createChatInstance(
    instanceKey: string,
    platform: AgentPlatformEnum,
    config: ResolvedAgentConfig
  ): Promise<Chat> {
    const [{ Chat }, { createIoRedisState }] = await Promise.all([
      esmImport('chat'),
      esmImport('@chat-adapter/state-ioredis'),
    ]);

    const adapters = await this.buildAdapters(platform, config);
    const client = this.cacheService.client;
    if (!client) {
      throw new Error('Cache in-memory provider client is not available for Conversational SDK state adapter');
    }

    return new Chat({
      userName: `novu-agent-${instanceKey}`,
      adapters,
      state: createIoRedisState({
        client,
        keyPrefix: `novu:agent:${instanceKey}`,
        logger: this.chatStateLogger(),
      }),
      logger: 'silent',
    });
  }

  private chatStateLogger() {
    return {
      debug: (msg: string, ctx?: Record<string, unknown>) => this.logger.debug(ctx ?? {}, msg),
      info: (msg: string, ctx?: Record<string, unknown>) => this.logger.info(ctx ?? {}, msg),
      warn: (msg: string, ctx?: Record<string, unknown>) => this.logger.warn(ctx ?? {}, msg),
      error: (msg: string, ctx?: Record<string, unknown>) => this.logger.error(ctx ?? {}, msg),
    };
  }

  private async buildAdapters(
    platform: AgentPlatformEnum,
    config: ResolvedAgentConfig
  ): Promise<Record<string, unknown>> {
    const { credentials, connectionAccessToken } = config;

    switch (platform) {
      case AgentPlatformEnum.SLACK: {
        if (!connectionAccessToken || !credentials.signingSecret) {
          throw new BadRequestException('Slack agent integration requires botToken and signingSecret credentials');
        }

        const { createSlackAdapter } = await esmImport('@chat-adapter/slack');

        return {
          slack: createSlackAdapter({
            botToken: connectionAccessToken,
            signingSecret: credentials.signingSecret,
          }),
        };
      }
      case AgentPlatformEnum.TEAMS: {
        if (!credentials.clientId || !credentials.secretKey || !credentials.tenantId) {
          throw new BadRequestException(
            'Teams agent integration requires appId, appPassword, and appTenantId credentials'
          );
        }

        const { createTeamsAdapter } = await esmImport('@chat-adapter/teams');

        return {
          teams: createTeamsAdapter({
            appId: credentials.clientId,
            appPassword: credentials.secretKey,
            appTenantId: credentials.tenantId,
          }),
        };
      }
      case AgentPlatformEnum.WHATSAPP: {
        if (
          !credentials.apiToken ||
          !credentials.secretKey ||
          !credentials.token ||
          !credentials.phoneNumberIdentification
        ) {
          throw new BadRequestException(
            'WhatsApp agent integration requires accessToken, appSecret, verifyToken, and phoneNumberId credentials'
          );
        }

        const { createWhatsAppAdapter } = await esmImport('@chat-adapter/whatsapp');

        return {
          whatsapp: createWhatsAppAdapter({
            accessToken: credentials.apiToken,
            appSecret: credentials.secretKey,
            verifyToken: credentials.token,
            phoneNumberId: credentials.phoneNumberIdentification,
          }),
        };
      }
      case AgentPlatformEnum.EMAIL: {
        const { senderName, outboundIntegrationId } = credentials;

        if (!credentials.secretKey) {
          throw new BadRequestException('Email agent integration requires secretKey credentials');
        }

        const { createNovuEmailAdapter } = await esmImport('@novu/chat-adapter-email');

        return {
          email: createNovuEmailAdapter({
            senderName,
            signingSecret: credentials.secretKey,
            sendEmail: this.buildSendEmailCallback(config, outboundIntegrationId),
          }),
        };
      }
      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }

  private registerEventHandlers(agentId: string, cached: CachedChat) {
    cached.chat.onNewMention(async (thread: Thread, message: Message) => {
      try {
        await thread.subscribe();
        await this.inboundHandler.handle(agentId, cached.config, thread, message, AgentEventEnum.ON_MESSAGE);
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling new mention`);
      }
    });

    cached.chat.onSubscribedMessage(async (thread: Thread, message: Message) => {
      try {
        await this.inboundHandler.handle(agentId, cached.config, thread, message, AgentEventEnum.ON_MESSAGE);
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling subscribed message`);
      }
    });

    cached.chat.onAction(async (event) => {
      try {
        if (!event.thread) {
          this.logger.warn(`[agent:${agentId}] Action received without thread context, skipping`);

          return;
        }

        await this.inboundHandler.handleAction(
          agentId,
          cached.config,
          event.thread as Thread,
          {
            actionId: event.actionId,
            value: event.value,
            sourceMessageId: event.messageId,
          },
          event.user.userId
        );
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling action ${event.actionId}`);
      }
    });

    cached.chat.onReaction(async (event: ReactionEvent) => {
      try {
        await this.inboundHandler.handleReaction(agentId, cached.config, {
          emoji: event.emoji,
          added: event.added,
          messageId: event.messageId,
          message: event.message,
          thread: event.thread as Thread | undefined,
          user: event.user,
        });
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling reaction`);
      }
    });
  }
}
