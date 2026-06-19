import { defineChannel, POST, type Channel, type ChannelEvents } from 'eve/channels';
import type { AgentBridgeRequest, ReplyContent } from '@novu/framework';
import { resolveNovuCredentials, type NovuCredentialsSource } from './credentials.js';
import { NovuApiClient, type TriggerRecipient } from './reply-client.js';
import { getSignatureHeader, verifyNovuSignature } from './signature.js';
import { encodeContinuationToken } from './token.js';

/**
 * Durable per-session state seeded from the inbound bridge request. Carries the
 * addressing needed to reply (`conversationId` + `integrationIdentifier`) and
 * the unified subscriber so `channel.novu.*` can target it.
 */
export interface NovuSessionState {
  readonly conversationId: string;
  readonly integrationIdentifier: string;
  readonly platform: string;
  readonly subscriberId: string | null;
}

/** The Novu surface exposed on `channel.novu` inside event handlers. */
export interface NovuChannelApi {
  /** The unified Novu subscriber id for this conversation, if resolved. */
  readonly subscriberId: string | null;
  /** Fire a Novu workflow (defaults the recipient to this conversation's subscriber). */
  trigger(workflowId: string, options?: { to?: TriggerRecipient; payload?: Record<string, unknown> }): Promise<void>;
  /** Persist a value on the Novu conversation. */
  setMetadata(key: string, value: unknown): Promise<void>;
  /** Mark the Novu conversation resolved. */
  resolve(summary?: string): Promise<void>;
  /** Low-level: post a raw reply payload (markdown or card). */
  reply(content: ReplyContent): Promise<void>;
}

/** Eve-core + Novu surface returned by the channel `context()` factory. */
export interface NovuChannelContext {
  readonly thread: {
    /** Post an assistant reply. A string is sent as markdown; a `ReplyContent` is sent as-is. */
    post(content: string | ReplyContent): Promise<void>;
  };
  readonly novu: NovuChannelApi;
}

export interface NovuChannelOptions {
  /** Credentials source. Defaults to env (`NOVU_SECRET_KEY` / `NOVU_AGENT_IDENTIFIER` / `NOVU_API_BASE_URL`). */
  readonly credentials?: NovuCredentialsSource;
  /** Webhook route path. Defaults to `/`. */
  readonly path?: string;
  /** Auto-resolve the Novu conversation when the session completes. Defaults to off. */
  readonly resolveOn?: 'session.completed' | 'never';
  /** Override or extend the default event handlers. */
  readonly events?: ChannelEvents<NovuChannelContext>;
  /** Injectable fetch (tests). */
  readonly fetch?: typeof fetch;
}

function buildContext(state: NovuSessionState, client: NovuApiClient): NovuChannelContext {
  const reply = (content: ReplyContent) =>
    client.reply({
      conversationId: state.conversationId,
      integrationIdentifier: state.integrationIdentifier,
      reply: content,
    });

  return {
    thread: {
      post: (content) => reply(typeof content === 'string' ? { markdown: content } : content),
    },
    novu: {
      subscriberId: state.subscriberId,
      trigger: (workflowId, options = {}) =>
        client.trigger(workflowId, {
          to: options.to ?? state.subscriberId ?? undefined,
          payload: options.payload,
        }),
      setMetadata: (key, value) =>
        client.reply({
          conversationId: state.conversationId,
          integrationIdentifier: state.integrationIdentifier,
          signals: [{ type: 'metadata', action: 'set', key, value }],
        }),
      resolve: (summary) =>
        client.reply({
          conversationId: state.conversationId,
          integrationIdentifier: state.integrationIdentifier,
          resolve: { summary },
        }),
      reply,
    },
  };
}

/**
 * The single unified Novu channel. Place as the default export of
 * `agent/channels/novu.ts`. One webhook route receives every platform connected
 * in the Novu dashboard; identity is unified by the Novu subscriber.
 *
 * Zero-config: a bare `novuChannel()` already delivers completed assistant
 * messages and (with `resolveOn`) resolves the conversation. Pass `events` to
 * customize; each handler's `channel` exposes `channel.thread.*` and
 * `channel.novu.*`.
 */
export function novuChannel(
  options: NovuChannelOptions = {},
): Channel<NovuSessionState, Record<string, unknown>, Record<string, unknown>> {
  const credentials = options.credentials ?? {};
  const client = new NovuApiClient(credentials, options.fetch);
  const path = options.path ?? '/';
  const resolveOn = options.resolveOn ?? 'never';

  const defaults: ChannelEvents<NovuChannelContext> = {
    async 'message.completed'(data, channel) {
      if (data.finishReason === 'tool-calls') return;
      if (data.message) await channel.thread.post(data.message);
    },
    async 'session.completed'(_data, channel) {
      if (resolveOn === 'session.completed') await channel.novu.resolve();
    },
  };

  return defineChannel<NovuSessionState, NovuChannelContext>({
    context: (state) => buildContext(state, client),
    events: { ...defaults, ...options.events },
    routes: [
      POST<NovuSessionState>(path, async (req, { send, waitUntil }) => {
        const rawBody = await req.text();

        const { secretKey } = await resolveNovuCredentials(credentials);
        if (!verifyNovuSignature(getSignatureHeader(req), rawBody, secretKey)) {
          return new Response('invalid signature', { status: 401 });
        }

        let bridge: AgentBridgeRequest;
        try {
          bridge = JSON.parse(rawBody) as AgentBridgeRequest;
        } catch {
          return new Response('invalid body', { status: 400 });
        }

        // First cut handles inbound messages; actions/reactions are a follow-up.
        const text = bridge.message?.text ?? '';
        if (!text) return Response.json({ ok: true, skipped: 'no-message' });

        const state: NovuSessionState = {
          conversationId: bridge.conversationId,
          integrationIdentifier: bridge.integrationIdentifier,
          platform: bridge.platform,
          subscriberId: bridge.subscriber?.subscriberId ?? null,
        };
        const auth = bridge.subscriber
          ? {
              authenticator: 'novu',
              principalId: bridge.subscriber.subscriberId,
              principalType: 'subscriber',
              attributes: {} as Record<string, string | readonly string[]>,
            }
          : null;

        const continuationToken = encodeContinuationToken({
          conversationId: bridge.conversationId,
          integrationIdentifier: bridge.integrationIdentifier,
          platform: bridge.platform,
        });

        waitUntil(send(text, { auth, continuationToken, state }));
        return Response.json({ ok: true });
      }),
    ],
  });
}
