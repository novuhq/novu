import type { Adapter, AdapterPostableMessage, CardElement, FileUpload, RawMessage } from 'chat';
import {
  type SendblueMessagePayload,
  type SendblueThreadId,
  SendblueAdapter as VendorSendblueAdapterRuntime,
} from 'chat-adapter-sendblue';
import { renderCardAsText } from './card-renderer.js';
import { markdownToPlainText } from './markdown-to-plain-text.js';
import type { SendblueAdapterConfig } from './types.js';

// iMessage-first with SMS fallback matches Sendblue's own delivery behavior;
// the vendor adapter defaults to iMessage-only, which would silently drop
// SMS-downgraded inbound replies.
const ALLOWED_SERVICES = ['iMessage', 'SMS'] as const;

interface VendorSendblueAdapterConfig {
  apiKey: string;
  apiSecret: string;
  defaultFromNumber: string;
  webhookSecret?: string;
  allowedServices?: readonly string[];
}

/*
 * The vendor `chat-adapter-sendblue` package ships ESM type declarations that
 * use extensionless relative re-exports (`export { SendblueAdapter } from
 * "./adapter"`). Under this package's `moduleResolution: nodenext`, those fail
 * to resolve, so the imported `SendblueAdapter` class has no usable type and
 * cannot be used directly as a base class. The runtime export is a real class,
 * so we retype it here as a constructor that yields a Chat SDK `Adapter` — the
 * only surface this subclass builds on (`encodeThreadId`, `decodeThreadId`,
 * `postMessage`, `userName`).
 */
interface VendorSendblueAdapterConstructor {
  new (config: VendorSendblueAdapterConfig): Adapter<SendblueThreadId, SendblueMessagePayload>;
}

const VendorSendblueAdapter = VendorSendblueAdapterRuntime as unknown as VendorSendblueAdapterConstructor;

/**
 * Thin subclass of the vendor-official `chat-adapter-sendblue` package
 * (https://chat-sdk.dev/adapters/vendor-official/sendblue), which is backed by
 * the official `sendblue` SDK. Inherits transport, webhook verification,
 * reactions, streaming, and message history from the vendor adapter, and only
 * customizes what it doesn't support for Novu Agents:
 *  - `userName` (hardcoded upstream, unrelated to the configured agent name)
 *  - rendering rich `CardElement` replies (e.g. tool-approval prompts) to
 *    plain text, since the vendor adapter only knows about string/markdown/ast
 *    postables and would otherwise silently drop card-only replies.
 *  - `isDM` / `openDM`, which the vendor adapter does not implement.
 */
export class SendblueAdapterImpl extends VendorSendblueAdapter {
  override readonly userName: string;
  override readonly persistThreadHistory = true;

  private readonly fromNumber: string;

  constructor(config: SendblueAdapterConfig) {
    super({
      apiKey: config.apiKey,
      apiSecret: config.secretKey,
      defaultFromNumber: config.fromNumber,
      webhookSecret: config.webhookSecret,
      allowedServices: [...ALLOWED_SERVICES],
    });
    this.userName = config.userName ?? 'sendblue-agent';
    this.fromNumber = config.fromNumber;
  }

  override isDM(threadId: string): boolean {
    return !this.decodeThreadId(threadId).groupId;
  }

  override async openDM(phoneNumber: string): Promise<string> {
    return this.encodeThreadId({ fromNumber: this.fromNumber, contactNumber: phoneNumber });
  }

  override async postMessage(
    threadId: string,
    message: AdapterPostableMessage
  ): Promise<RawMessage<SendblueMessagePayload>> {
    return super.postMessage(threadId, this.preparePostable(message));
  }

  private preparePostable(message: AdapterPostableMessage): AdapterPostableMessage {
    const flattened = this.flattenCard(message);

    if (typeof flattened === 'string') {
      return flattened;
    }

    const record = flattened as unknown as Record<string, unknown>;
    if (typeof record.markdown === 'string') {
      return { ...flattened, markdown: markdownToPlainText(record.markdown) };
    }

    return flattened;
  }

  /**
   * The vendor adapter only renders `string` / `{ markdown }` / `{ raw }` /
   * `{ ast }` postables — a bare `{ card }` (e.g. a tool-approval prompt with
   * its buttons already stripped by `adaptApprovalContentForReplyBasedPlatform`)
   * renders to an empty string and is silently skipped. Prefer the card's own
   * `fallbackText` when the caller provided one, otherwise flatten it via
   * `renderCardAsText`. Any `files` posted alongside the card are carried over,
   * since the vendor adapter uploads them for `{ markdown }` postables too.
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
    const files = Array.isArray(record.files) ? (record.files as FileUpload[]) : undefined;

    return {
      markdown: fallbackText ?? renderCardAsText(card),
      ...(files?.length ? { files } : {}),
    };
  }
}
