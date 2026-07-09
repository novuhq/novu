import type {
  Adapter,
  AdapterPostableMessage,
  CardElement,
  ChatInstance,
  Message as ChatMessage,
  EmojiValue,
  FetchOptions,
  FetchResult,
  FormattedContent,
  RawMessage,
  ThreadInfo,
  WebhookOptions,
} from 'chat';
import {
  createSendblueAdapter as createVendorSendblueAdapter,
  type SendblueMessagePayload,
  type SendblueThreadId,
  type SendblueAdapter as VendorSendblueAdapter,
} from 'chat-adapter-sendblue';
import { renderCardAsText } from './card-renderer.js';
import type { SendblueAdapterConfig } from './types.js';

// iMessage-first with SMS fallback matches Sendblue's own delivery behavior;
// the vendor adapter defaults to iMessage-only, which would silently drop
// SMS-downgraded inbound replies.
const ALLOWED_SERVICES = ['iMessage', 'SMS'] as const;

/**
 * Thin compatibility wrapper around the vendor-official `chat-adapter-sendblue`
 * package (https://chat-sdk.dev/adapters/vendor-official/sendblue), which is
 * backed by the official `sendblue` SDK. Delegates transport, webhook
 * verification, reactions, streaming, and message history to the vendor
 * adapter, and only overrides what it doesn't support for Novu Agents:
 *  - `userName` (hardcoded upstream, unrelated to the configured agent name)
 *  - rendering rich `CardElement` replies (e.g. tool-approval prompts) to
 *    plain text, since the vendor adapter only knows about string/markdown/ast
 *    postables and would otherwise silently drop card-only replies.
 */
export class SendblueAdapterImpl implements Adapter<SendblueThreadId, SendblueMessagePayload> {
  readonly name = 'sendblue';
  readonly userName: string;
  readonly persistThreadHistory = true;

  private readonly vendor: VendorSendblueAdapter;
  private readonly fromNumber: string;

  constructor(config: SendblueAdapterConfig) {
    this.userName = config.userName ?? 'sendblue-agent';
    this.fromNumber = config.fromNumber;
    this.vendor = createVendorSendblueAdapter({
      apiKey: config.apiKey,
      apiSecret: config.secretKey,
      defaultFromNumber: config.fromNumber,
      webhookSecret: config.webhookSecret,
      allowedServices: [...ALLOWED_SERVICES],
    });

    /*
     * The vendor adapter's own `handleWebhook` dispatches inbound messages via
     * `chat.processMessage(this, ...)`, passing its own raw instance rather
     * than this wrapper. Chat SDK bookkeeping that reads straight off that
     * passed-in instance — e.g. `adapter.isDM?.(threadId)`, used to populate
     * `thread.isDM` / `platformContext.isDM` — therefore bypasses our
     * overrides entirely. The vendor class doesn't implement `isDM` at all
     * (falling back to `false`), so patch it directly onto the vendor
     * instance in addition to defining it below on this wrapper.
     */
    (this.vendor as unknown as Adapter).isDM = (threadId: string) => this.isDM(threadId);
  }

  async initialize(chat: ChatInstance): Promise<void> {
    await this.vendor.initialize(chat);
  }

  async disconnect(): Promise<void> {
    await this.vendor.disconnect?.();
  }

  // -- Thread ID methods --

  encodeThreadId(data: SendblueThreadId): string {
    return this.vendor.encodeThreadId(data);
  }

  decodeThreadId(threadId: string): SendblueThreadId {
    return this.vendor.decodeThreadId(threadId);
  }

  channelIdFromThreadId(threadId: string): string {
    return this.vendor.channelIdFromThreadId(threadId);
  }

  isDM(threadId: string): boolean {
    return !this.decodeThreadId(threadId).groupId;
  }

  async openDM(phoneNumber: string): Promise<string> {
    return this.encodeThreadId({ fromNumber: this.fromNumber, contactNumber: phoneNumber });
  }

  // -- Inbound --

  async handleWebhook(request: Request, options?: WebhookOptions): Promise<Response> {
    return this.vendor.handleWebhook(request, options);
  }

  parseMessage(raw: SendblueMessagePayload): ChatMessage<SendblueMessagePayload> {
    return this.vendor.parseMessage(raw);
  }

  // -- Outbound --

  async postMessage(threadId: string, message: AdapterPostableMessage): Promise<RawMessage<SendblueMessagePayload>> {
    const flattened = this.flattenCard(message);

    return this.vendor.postMessage(threadId, flattened);
  }

  /**
   * The vendor adapter only renders `string` / `{ markdown }` / `{ raw }` /
   * `{ ast }` postables — a bare `{ card }` (e.g. a tool-approval prompt with
   * its buttons already stripped by `adaptApprovalContentForReplyBasedPlatform`)
   * renders to an empty string and is silently skipped. Prefer the card's own
   * `fallbackText` when the caller provided one, otherwise flatten it via
   * `renderCardAsText`.
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

    return { markdown: fallbackText ?? renderCardAsText(card) };
  }

  // -- Rendering --

  renderFormatted(content: FormattedContent): string {
    return this.vendor.renderFormatted(content);
  }

  // -- Thread metadata --

  async fetchThread(threadId: string): Promise<ThreadInfo> {
    return this.vendor.fetchThread(threadId);
  }

  async fetchMessages(threadId: string, options?: FetchOptions): Promise<FetchResult<SendblueMessagePayload>> {
    return this.vendor.fetchMessages(threadId, options);
  }

  // -- Typing / reactions --

  async startTyping(threadId: string): Promise<void> {
    return this.vendor.startTyping(threadId);
  }

  async addReaction(threadId: string, messageId: string, emoji: EmojiValue | string): Promise<void> {
    return this.vendor.addReaction(threadId, messageId, emoji);
  }

  async removeReaction(threadId: string, messageId: string, emoji: EmojiValue | string): Promise<void> {
    return this.vendor.removeReaction(threadId, messageId, emoji);
  }

  // -- Unsupported operations (delegated — the vendor adapter throws/no-ops identically) --

  async editMessage(
    threadId: string,
    messageId: string,
    message: AdapterPostableMessage
  ): Promise<RawMessage<SendblueMessagePayload>> {
    return this.vendor.editMessage(threadId, messageId, message);
  }

  async deleteMessage(threadId: string, messageId: string): Promise<void> {
    return this.vendor.deleteMessage(threadId, messageId);
  }
}
