import { createMemoryState } from '@chat-adapter/state-memory';
import { createNovuAdapter, getNovuContext } from '@novu/chat-sdk-adapter';
import { type Adapter, Chat, type StateAdapter } from 'chat';

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
export function registerHandlers(chat: Chat): void {
  // First message in a brand-new channel conversation.
  chat.onNewMention(async (thread, message) => {
    await thread.post(`👋 Hi! You said: "${message.text}". I'll remember this conversation.`);
  });

  // First message in a DM.
  chat.onDirectMessage(async (thread, message) => {
    await thread.post(`👋 Hello! (DM) You said: "${message.text}".`);
  });

  // Every subsequent message in an ongoing conversation.
  chat.onSubscribedMessage(async (thread, message) => {
    const novu = getNovuContext(thread);

    // Demonstrate the opt-in, Novu-only escape hatch.
    if (message.text.trim().toLowerCase() === 'resolve') {
      await novu.resolve('Resolved from the playground agent.');
      await thread.post('✅ Marked this conversation as resolved.');

      return;
    }

    await thread.post(`echo (${novu.platform}): ${message.text}`);
  });

  // Button clicks from interactive cards.
  chat.onAction(async (event) => {
    await event.thread?.post(`You clicked **${event.actionId}**${event.value ? ` (value: ${event.value})` : ''}.`);
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
