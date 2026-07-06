import type { Adapter } from 'chat';

export interface NovuWebAdapterConfig {
  /**
   * Redis pub/sub channel prefix for this agent+integration pair, e.g.
   * `novu:agent:web:stream:<agentId>:<integrationIdentifier>`. The full channel
   * is `<channelPrefix>:<platformThreadId>` — see buildWebStreamChannel().
   */
  channelPrefix: string;
  /**
   * Publishes a serialized WebOutboundEvent onto the relay channel. Supplied by
   * the host (api-service passes ioredis `publish`), keeping this package free
   * of any Redis/Nest dependency. Publishing with zero subscribers is the
   * expected steady state: delivery persistence happens in the host's outbound
   * gateway, and clients recover missed events by refetching history.
   */
  publish: (channel: string, payload: string) => Promise<unknown>;
  /** Agent display name attached to outbound raw messages. */
  agentName?: string;
}

export interface NovuWebThreadId {
  subscriberId: string;
  conversationId: string;
}

/**
 * Inbound raw message synthesized by the API layer from a subscriber-JWT
 * authenticated POST — the web platform has no webhook; requests are dispatched
 * natively via `chat.processMessage()`.
 */
export interface NovuWebRawMessage {
  id: string;
  subscriberId: string;
  conversationId: string;
  text: string;
  senderName?: string;
  createdAt: string;
}

/** URL-only file reference; binary payloads never travel over the relay. */
export interface WebFileRef {
  filename?: string;
  mimeType?: string;
  size?: number;
  url: string;
}

export interface WebMessageContent {
  markdown?: string;
  /** Portable Chat SDK CardElement JSON, delivered untranslated to the browser. */
  card?: Record<string, unknown>;
  files?: WebFileRef[];
}

/** Events published on the relay channel and pumped onto the open SSE stream. */
export type WebOutboundEvent =
  | { kind: 'message'; messageId: string; content: WebMessageContent; ts: number }
  | { kind: 'edit'; messageId: string; content: WebMessageContent; ts: number }
  | { kind: 'delete'; messageId: string; ts: number }
  | { kind: 'typing'; status: string; ts: number }
  | { kind: 'reaction'; messageId: string; emoji: string; added: boolean; ts: number };

export type NovuWebAdapter = Adapter<NovuWebThreadId, NovuWebRawMessage>;
