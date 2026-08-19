import { iMessageAdapter } from '@photon-ai/chat-adapter-imessage';
import type { AdapterPostableMessage, CardElement, RawMessage } from 'chat';
import { ConsoleLogger } from 'chat';
import { renderCardAsText } from './card-renderer.js';
import type { PhotonImessageAdapterConfig } from './types.js';
import { buildStandardWebhookVerifier } from './verify-standard-webhook.js';

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

  constructor(config: PhotonImessageAdapterConfig) {
    super({
      projectId: config.projectId,
      projectSecret: config.projectSecret,
      webhookVerifier: buildStandardWebhookVerifier(config.webhookSecret),
      logger: config.logger ?? new ConsoleLogger('info').child('photon-imessage'),
    });
    this.userName = config.userName ?? 'photon-imessage-agent';
  }

  override async postMessage(threadId: string, message: AdapterPostableMessage): Promise<RawMessage> {
    return super.postMessage(threadId, this.flattenCard(message));
  }

  /**
   * A bare `{ card }` postable (e.g. a tool-approval prompt with its buttons
   * already stripped by `adaptApprovalContentForReplyBasedPlatform`) should
   * prefer the caller-provided `fallbackText`; otherwise flatten the card via
   * `renderCardAsText` so link URLs and fields survive as plain text.
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
}
