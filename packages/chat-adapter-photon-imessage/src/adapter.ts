import { iMessageAdapter } from '@photon-ai/chat-adapter-imessage';
import type { AdapterPostableMessage, CardElement, RawMessage, WebhookOptions } from 'chat';
import { ConsoleLogger } from 'chat';
import { renderCardAsMarkdown } from './card-renderer.js';
import type { PhotonImessageAdapterConfig } from './types.js';
import { buildSpectrumWebhookVerifier, type SpectrumWebhookVerifier } from './verify-spectrum-webhook.js';

/**
 * Receipt-type contents Spectrum delivers on the `messages` webhook that are
 * not conversational turns. The vendor adapter's event skip list omits them
 * (as of @photon-ai/chat-adapter-imessage 3.2.0), so a read receipt for the
 * agent's own reply surfaced as an empty inbound "message" from the user —
 * and the agent answered itself in a loop (send → user reads → receipt →
 * reply → read → …). Filtered here until the vendor list includes them;
 * receipts are consumed by the delivery-status webhook pipeline instead.
 */
const RECEIPT_CONTENT_TYPES = new Set(['read', 'delivered']);

/**
 * Thin subclass of the vendor-official `@photon-ai/chat-adapter-imessage`
 * package (Chat SDK adapter over spectrum-ts / Spectrum Cloud). Inherits
 * transport, thread encoding, reactions, typing, `isDM`/`openDM`, and
 * message history from the vendor adapter, and only customizes what Novu
 * Agents need:
 *  - `userName` (empty upstream, unrelated to the configured agent name)
 *  - inbound verification via Standard Webhooks (`whsec_` secret from the
 *    Photon webhook registration) instead of the vendor default, which
 *    verifies the legacy `X-Spectrum-Signature` v0 header. The custom
 *    `webhookVerifier` takes precedence over `webhookSecret` upstream.
 *  - rendering rich `CardElement` replies (e.g. tool-approval prompts) with
 *    Novu's fallback-text semantics before handing off to the vendor's
 *    plain-text card handling.
 */
export class PhotonImessageAdapterImpl extends iMessageAdapter {
  override readonly userName: string;
  private readonly verifyWebhook: SpectrumWebhookVerifier;

  constructor(config: PhotonImessageAdapterConfig) {
    const verifyWebhook = buildSpectrumWebhookVerifier(config.webhookSecret);
    super({
      projectId: config.projectId,
      projectSecret: config.projectSecret,
      webhookVerifier: verifyWebhook,
      logger: config.logger ?? new ConsoleLogger('info').child('photon-imessage'),
    });
    this.verifyWebhook = verifyWebhook;
    this.userName = config.userName ?? 'photon-imessage-agent';
  }

  /**
   * Chat SDK cleanup hook — the vendor adapter has none, which strands the
   * spectrum app (gRPC channels, token renewal) on every registry eviction.
   */
  async disconnect(): Promise<void> {
    const self = this as unknown as { app?: { stop(): Promise<void> } | null };
    await self.app?.stop();
    self.app = null;
  }

  /**
   * Drops receipt-type deliveries (see `RECEIPT_CONTENT_TYPES`) before the
   * vendor router turns them into inbound messages. Signature is still
   * verified before acking so unsigned junk never earns a 200.
   */
  override async handleWebhook(request: Request, options?: WebhookOptions): Promise<Response> {
    let contentType: string | undefined;
    try {
      const parsed = JSON.parse(await request.clone().text()) as { message?: { content?: { type?: string } } };
      contentType = parsed?.message?.content?.type;
    } catch {
      // Malformed body — fall through and let the vendor handler produce its own 4xx.
    }

    if (contentType && RECEIPT_CONTENT_TYPES.has(contentType)) {
      const rawBody = await request.text();
      try {
        this.verifyWebhook(request, rawBody);
      } catch {
        return new Response('Invalid webhook signature', { status: 401 });
      }

      return new Response(null, { status: 200 });
    }

    return super.handleWebhook(request, options);
  }

  override async postMessage(threadId: string, message: AdapterPostableMessage): Promise<RawMessage> {
    return super.postMessage(threadId, this.flattenCard(message));
  }

  /**
   * A bare `{ card }` postable (e.g. a tool-approval prompt with its buttons
   * already stripped by `adaptApprovalContentForReplyBasedPlatform`) should
   * prefer the caller-provided `fallbackText`; otherwise flatten the card via
   * `renderCardAsMarkdown` — iMessage renders markdown natively, so links and
   * field labels keep their styling.
   */
  private flattenCard(message: AdapterPostableMessage): AdapterPostableMessage {
    if (typeof message === 'string') {
      return message;
    }

    const record = message as unknown as Record<string, unknown>;
    const card = (record.card ?? (record.type === 'card' ? record : undefined)) as CardElement | undefined;

    if (!card) {
      return message;
    }

    const fallbackText = typeof record.fallbackText === 'string' ? record.fallbackText : undefined;
    const files = Array.isArray(record.files) && record.files.length > 0 ? record.files : undefined;

    return { markdown: fallbackText ?? renderCardAsMarkdown(card), ...(files ? { files } : {}) } as AdapterPostableMessage;
  }
}
