import { createHmac } from 'node:crypto';
import { createMemoryState } from '@chat-adapter/state-memory';
import { type AgentBridgeRequest, createNovuAdapter } from '@novu/chat-sdk-adapter';
import { type Adapter, Chat, type StateAdapter } from 'chat';
import { registerHandlers } from '../agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIM_SECRET = process.env.NOVU_SECRET_KEY ?? 'playground-dev-secret';

function sign(body: string, secret: string): string {
  const ts = Date.now();
  const hmac = createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');

  return `t=${ts},v1=${hmac}`;
}

interface SimulateBody {
  text?: string;
  event?: 'onMessage' | 'onAction' | 'onReaction' | 'onResolve';
  platform?: string;
  isDM?: boolean;
  /** messageCount > 1 (or non-empty history) routes to onSubscribedMessage. */
  ongoing?: boolean;
  emoji?: string;
  actionId?: string;
}

function buildBridge(input: SimulateBody): AgentBridgeRequest {
  const ongoing = input.ongoing ?? true;
  const platform = input.platform ?? 'slack';
  const now = new Date().toISOString();
  const text = input.text ?? 'hello from the simulator';

  return {
    version: 1,
    timestamp: now,
    deliveryId: `sim-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    event: input.event ?? 'onMessage',
    agentId: process.env.NOVU_AGENT_IDENTIFIER ?? 'playground-agent',
    replyUrl: 'https://api.novu.co/v1/agents/playground-agent/reply',
    conversationId: 'sim-conversation',
    integrationIdentifier: `${platform}-playground`,
    action:
      input.event === 'onAction'
        ? { id: input.actionId ?? 'approve', value: 'sim-value', sourceMessageId: 'sim-msg' }
        : null,
    message:
      input.event === 'onAction' || input.event === 'onReaction'
        ? null
        : {
            text,
            platformMessageId: `sim-msg-${Date.now()}`,
            author: { userId: 'sim-user', userName: 'tester', fullName: 'Sim Tester', isBot: false },
            timestamp: now,
          },
    reaction:
      input.event === 'onReaction'
        ? { messageId: 'sim-msg', emoji: { name: input.emoji ?? 'thumbs_up' }, added: true, message: null }
        : null,
    conversation: {
      identifier: 'sim-conversation',
      status: 'open',
      metadata: {},
      messageCount: ongoing ? 3 : 1,
      createdAt: now,
      lastActivityAt: now,
    },
    subscriber: { subscriberId: 'sim-subscriber', firstName: 'Sim', email: 'sim@example.com' },
    history: ongoing ? [{ role: 'user', type: 'text', content: 'previous message', createdAt: now }] : [],
    platform,
    platformContext: { threadId: 'sim-thread', channelId: 'sim-channel', isDM: input.isDM ?? false },
  };
}

/**
 * Local, credential-free echo test. Crafts a signed `AgentBridgeRequest`, feeds
 * it through a throwaway Novu adapter whose reply POSTs are captured instead of
 * sent to Novu, and returns whatever the agent would have replied. Lets you
 * exercise the full inbound→handler→reply path from the browser test page.
 */
export async function POST(req: Request): Promise<Response> {
  const input = (await req.json().catch(() => ({}))) as SimulateBody;

  const replies: Array<{ url: string; payload: unknown }> = [];
  const capturingFetch: typeof fetch = async (url, init) => {
    replies.push({
      url: String(url),
      payload: init?.body ? JSON.parse(init.body as string) : null,
    });

    return new Response(JSON.stringify({ messageId: 'sim-reply', platformThreadId: 'sim-thread' }), {
      status: 200,
    });
  };

  const novu = createNovuAdapter({
    apiKey: 'sim-api-key',
    agentIdentifier: process.env.NOVU_AGENT_IDENTIFIER ?? 'playground-agent',
    bridgeSecret: SIM_SECRET,
    fetch: capturingFetch,
  });
  const chat = new Chat({
    userName: 'novu-playground-sim',
    adapters: { novu: novu as unknown as Adapter },
    state: createMemoryState() as unknown as StateAdapter,
  });
  registerHandlers(chat);
  await chat.initialize();

  const bridge = buildBridge(input);
  const body = JSON.stringify(bridge);
  const request = new Request('http://local/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'novu-signature': sign(body, SIM_SECRET) },
    body,
  });

  const response = await novu.handleWebhook(request);

  return Response.json({
    status: response.status,
    routedTo: routeLabel(bridge),
    replies,
  });
}

function routeLabel(bridge: AgentBridgeRequest): string {
  if (bridge.event === 'onAction') return 'onAction';
  if (bridge.event === 'onReaction') return 'onReaction';
  if (bridge.conversation.messageCount > 1 || bridge.history.length > 0) return 'onSubscribedMessage';

  return 'onNewMention';
}
