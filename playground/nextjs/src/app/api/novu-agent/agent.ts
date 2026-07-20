import { createAnthropic } from '@ai-sdk/anthropic';
import { createMemoryState } from '@chat-adapter/state-memory';
import { createNovuAdapter, getNovuContext } from '@novu/chat-sdk-adapter';
import { generateText, stepCountIs, tool } from 'ai';
import {
  Actions,
  type Adapter,
  Button,
  Card,
  type CardElement,
  CardText,
  Chat,
  Divider,
  Field,
  Fields,
  LinkButton,
  type Message,
  Section,
  type StateAdapter,
  type Thread,
} from 'chat';
import { z } from 'zod';

/**
 * A rich interactive card built with the chat-sdk programmatic builders. The
 * same portable card renders natively on every channel (web, Slack, Teams, …);
 * content is a realistic order-confirmation so the demo reads like a product,
 * not a test fixture.
 */
function buildDemoCard(_platform: string): CardElement {
  return Card({
    title: 'Your order is ready for pickup',
    subtitle: 'Blue Bottle Coffee — 123 Market St',
    children: [
      CardText('Order **#1024** is packed and waiting at the counter. Show this card at pickup.'),
      Fields([
        Field({ label: 'Order', value: '#1024' }),
        Field({ label: 'Total', value: '$18.50' }),
        Field({ label: 'Ready until', value: '6:00 PM' }),
        Field({ label: 'Pickup code', value: 'BB-7291' }),
      ]),
      Divider(),
      Actions([
        Button({ id: 'confirm-pickup', label: 'Confirm pickup', style: 'primary', value: 'order-1024' }),
        Button({ id: 'cancel-order', label: 'Cancel order', style: 'danger', value: 'order-1024' }),
        LinkButton({ url: 'https://novu.co', label: 'Track order' }),
      ]),
    ],
  });
}

/** Friendly, per-action confirmations the card resolves into when clicked. */
const ACTION_CONFIRMATIONS: Record<string, string> = {
  'confirm-pickup': '✅ **Pickup confirmed** — order #1024 is waiting for you at the counter. See you soon!',
  'cancel-order': '🚫 **Order cancelled.** Your refund for $18.50 is on its way.',
};

/**
 * Shared agent definition for the Novu Chat-adapter playground.
 *
 * The same `registerHandlers` is used by:
 *  - the live bridge endpoint (`/api/novu-agent`), which Novu POSTs real
 *    `AgentBridgeRequest`s to, and
 *  - the local simulator (`/api/novu-agent/simulate`), which feeds a signed
 *    sample request through a throwaway instance so you can test routing and
 *    replies in the browser without any channel or Novu credentials.
 */
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';

const SYSTEM_PROMPT = [
  'You are the Novu playground agent, chatting with a developer who is trying out',
  "Novu's agent channels (web chat, Slack, email, …). Be concise, helpful, and a",
  'little playful. Answer in markdown.',
  '',
  'You can show a rich interactive card (a sample order-pickup confirmation with',
  'buttons) with the show_demo_card tool — use it when the user asks to see a card,',
  'buttons, or rich content. After the tool runs, briefly tell the user to try the',
  'buttons.',
  '',
  'User messages wrapped in [brackets] are interaction events (e.g. a button',
  'click), not literal text the user typed — react to the event naturally and',
  'keep the conversation moving; never echo the brackets back.',
].join('\n');

/**
 * Real LLM turn via the AI SDK + the Claude API. Conversation memory comes from
 * Novu (`novu.getHistory()` is the persisted cross-channel transcript), so the
 * bridge itself stays stateless. `latestUserTurn` is the inbound message text,
 * or a synthetic event description (e.g. a card button click) so interactions
 * keep the conversation flowing.
 */
async function respondWithClaude(thread: Thread, latestUserTurn: string): Promise<void> {
  const novu = getNovuContext(thread);
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  await thread.startTyping('Thinking…');

  const history = await novu.getHistory();
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = history
    .filter((entry) => entry.type === 'message' && (entry.role === 'user' || entry.role === 'assistant'))
    .map((entry) => ({ role: entry.role as 'user' | 'assistant', content: entry.content }));

  // The bridge payload's history normally already contains the inbound message;
  // append it defensively in case this turn beat persistence (and always for
  // synthetic turns like button clicks, which are not persisted as messages).
  if (messages[messages.length - 1]?.content !== latestUserTurn) {
    messages.push({ role: 'user', content: latestUserTurn });
  }

  const result = await generateText({
    model: anthropic(ANTHROPIC_MODEL),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      show_demo_card: tool({
        description: 'Post a rich interactive demo card (fields, buttons, links) into the conversation.',
        inputSchema: z.object({}),
        execute: async () => {
          await thread.post(buildDemoCard(novu.platform));

          return 'The demo card is now visible to the user.';
        },
      }),
    },
    stopWhen: stepCountIs(3),
  });

  if (result.text.trim()) {
    await thread.post(result.text);
  }
}

async function handleInbound(thread: Thread, message: Message): Promise<void> {
  const novu = getNovuContext(thread);
  const keyword = message.text.trim().toLowerCase();

  // Deterministic demo keywords keep working regardless of the LLM.
  if (keyword === 'card') {
    await thread.post(buildDemoCard(novu.platform));

    return;
  }

  if (keyword === 'resolve') {
    await novu.resolve('Resolved from the playground agent.');
    await thread.post('✅ Marked this conversation as resolved.');

    return;
  }

  if (keyword === 'whoami') {
    const subscriber = await novu.getSubscriber();
    const user = await thread.adapter.getUser?.(message.author.userId);
    await thread.post(
      `👤 subscriber: ${subscriber?.subscriberId ?? 'unknown'} (${subscriber?.email ?? 'no email'})` +
        (user ? ` · userInfo: ${user.fullName}` : '')
    );

    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    await thread.post(
      `echo (${novu.platform}): ${message.text}\n\n_Set \`ANTHROPIC_API_KEY\` in \`playground/nextjs/.env\` to chat with a real Claude-powered agent._`
    );

    return;
  }

  try {
    await respondWithClaude(thread, message.text);
  } catch (err) {
    console.error('[novu-agent] Claude turn failed', err);
    await thread.post(`⚠️ Claude call failed: ${err instanceof Error ? err.message : 'unknown error'}`);
  }
}

export function registerHandlers(chat: Chat): void {
  // First message in a brand-new conversation. For DMs, Chat SDK routes here only when
  // no onDirectMessage handler is registered (see chat-sdk DirectMessageHandler docs).
  chat.onNewMention(handleInbound);

  // Every subsequent message in an ongoing conversation (channels and DMs). The Novu
  // adapter pre-subscribes when messageCount > 1 or history is non-empty.
  chat.onSubscribedMessage(handleInbound);

  // Button clicks from interactive cards. Mirror the Slack agent UX: resolve the
  // card by editing it in place (buttons disappear), instead of stacking a new
  // message under a still-interactive card.
  chat.onAction(async (event) => {
    const thread = event.thread;
    if (!thread) return;

    const summary =
      ACTION_CONFIRMATIONS[event.actionId] ??
      `✅ You clicked **${event.actionId}**${event.value ? ` (value: ${event.value})` : ''}.`;

    // Resolve the card in place first (instant feedback, buttons disappear)…
    if (event.messageId) {
      await thread.adapter.editMessage(thread.id, event.messageId, { markdown: summary });
    } else {
      await thread.post(summary);
    }

    // …then let the agent continue the flow conversationally. Button clicks
    // aren't persisted as messages, so the event is handed to the model as a
    // synthetic user turn.
    if (!process.env.ANTHROPIC_API_KEY) return;

    try {
      await respondWithClaude(
        thread as Thread,
        `[The user clicked the "${event.actionId}" button on the interactive card` +
          `${event.value ? ` (value: ${event.value})` : ''}. It resolved to: "${summary}". ` +
          'Acknowledge briefly and continue the conversation naturally.]'
      );
    } catch (err) {
      console.error('[novu-agent] Claude follow-up after action failed', err);
    }
  });

  // Emoji reactions.
  chat.onReaction(async (event) => {
    if (!event.added) return;
    await event.thread.post(`Thanks for the ${event.emoji} reaction!`);
  });
}

let agentPromise: Promise<{ chat: Chat; novu: Adapter }> | null = null;

/**
 * Build (once) and return the live bridge agent. Requires `NOVU_SECRET_KEY` and
 * `NOVU_AGENT_IDENTIFIER`. Uses the zero-deps in-memory state adapter — fine for
 * a single playground instance; swap in a shared state adapter for multi-instance.
 */
export function getNovuAgent(): Promise<{ chat: Chat; novu: Adapter }> {
  if (!agentPromise) {
    agentPromise = (async () => {
      const apiKey = process.env.NOVU_SECRET_KEY;
      const agentIdentifier = process.env.NOVU_AGENT_IDENTIFIER;
      if (!apiKey) throw new Error('NOVU_SECRET_KEY is not set');
      if (!agentIdentifier) throw new Error('NOVU_AGENT_IDENTIFIER is not set');

      const novu = createNovuAdapter({
        apiKey,
        agentIdentifier,
        bridgeSecret: apiKey,
        ...(process.env.NOVU_API_BASE_URL ? { apiBaseUrl: process.env.NOVU_API_BASE_URL } : {}),
        ...(process.env.NOVU_BRIDGE_URL ? { bridgeUrl: process.env.NOVU_BRIDGE_URL } : {}),
      });

      const chat = new Chat({
        userName: 'novu-playground-agent',
        adapters: { novu: novu as unknown as Adapter },
        state: createMemoryState() as unknown as StateAdapter,
      });

      registerHandlers(chat);
      await chat.initialize();

      return { chat, novu: novu as unknown as Adapter };
    })();
  }

  return agentPromise;
}
