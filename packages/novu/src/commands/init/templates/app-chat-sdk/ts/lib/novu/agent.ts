import { createMemoryState } from '@chat-adapter/state-memory';
import { createNovuAdapter, getNovuContext } from '@novu/chat-sdk-adapter';
import { type Adapter, Chat, type StateAdapter } from 'chat';

export function registerHandlers(chat: Chat): void {
  chat.onNewMention(async (thread, message) => {
    if (thread.isDM) {
      await thread.post(`👋 Hello! (DM) You said: "${message.text}".`);

      return;
    }

    await thread.post(`👋 Hi! You said: "${message.text}". I'll remember this conversation.`);
  });

  chat.onSubscribedMessage(async (thread, message) => {
    const novu = getNovuContext(thread);

    if (message.text.trim().toLowerCase() === 'resolve') {
      await novu.resolve('Resolved from the Chat SDK agent.');
      await thread.post('✅ Marked this conversation as resolved.');

      return;
    }

    if (message.text.trim().toLowerCase() === 'whoami') {
      const subscriber = await novu.getSubscriber();
      const user = await thread.adapter.getUser?.(message.author.userId);
      await thread.post(
        `👤 subscriber: ${subscriber?.subscriberId ?? 'unknown'}` + (user ? ` · userInfo: ${user.fullName}` : '')
      );

      return;
    }

    await thread.post(`echo (${novu.platform}): ${message.text}`);
  });

  chat.onAction(async (event) => {
    await event.thread?.post(`You clicked **${event.actionId}**${event.value ? ` (value: ${event.value})` : ''}.`);
  });

  chat.onReaction(async (event) => {
    if (!event.added) return;
    await event.thread.post(`Thanks for the ${event.emoji} reaction!`);
  });
}

let agentPromise: Promise<{ chat: Chat; novu: Adapter }> | null = null;

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
      });

      const chat = new Chat({
        userName: agentIdentifier,
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
