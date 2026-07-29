import { shortId } from '@novu/application-generic';
import type { CardElement, Message, Thread } from 'chat';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';

export type WebChatDeliverMessageParams = {
  threadId: string;
  content: string;
  richContent?: Record<string, unknown>;
};

export type WebChatDeliverMessage = (params: WebChatDeliverMessageParams) => Promise<{ id: string; threadId: string }>;

function sentMessageStub(messageId: string, threadId: string) {
  return {
    id: messageId,
    threadId,
    addReaction: async () => {},
    removeReaction: async () => {},
    edit: async () => sentMessageStub(messageId, threadId),
    delete: async () => {},
  };
}

function parseThreadPostArg(arg: unknown): { content: string; richContent?: Record<string, unknown> } {
  if (typeof arg === 'string') {
    return { content: arg };
  }

  if (arg && typeof arg === 'object') {
    const record = arg as { markdown?: string; card?: CardElement; files?: unknown[] };
    const richContent: Record<string, unknown> = {};
    if (record.card) {
      richContent.card = record.card;
    }
    if (record.files?.length) {
      richContent.files = record.files;
    }

    if (record.markdown) {
      return { content: record.markdown, richContent: Object.keys(richContent).length ? richContent : undefined };
    }

    if (record.card) {
      return { content: record.card.title ?? '[Card]', richContent };
    }
  }

  return { content: '' };
}

export function buildWebChatMessage(subscriberId: string, text: string): Message {
  const messageId = `msg_${shortId(12)}`;

  return {
    id: messageId,
    text,
    author: {
      userId: subscriberId,
      fullName: subscriberId,
      userName: subscriberId,
      isBot: false,
    },
    metadata: { dateSent: new Date() },
  } as Message;
}

/**
 * REST → inbound-turn bridge. When `deliverMessage` is provided, `thread.post()` persists
 * durable agent activity (gate replies). Runtime replies use OutboundGateway.deliver().
 */
export function buildWebChatThread(conversationIdentifier: string, deliverMessage?: WebChatDeliverMessage): Thread {
  const post = async (arg: unknown) => {
    const { content, richContent } = parseThreadPostArg(arg);

    if (deliverMessage) {
      const delivered = await deliverMessage({
        threadId: conversationIdentifier,
        content,
        richContent,
      });

      return sentMessageStub(delivered.id, delivered.threadId);
    }

    const messageId = `msg_${shortId(12)}`;

    return sentMessageStub(messageId, conversationIdentifier);
  };

  return {
    id: conversationIdentifier,
    channelId: conversationIdentifier,
    isDM: true,
    startTyping: async () => {},
    subscribe: async () => {},
    post,
    toJSON: () => ({ id: conversationIdentifier, platform: AgentPlatformEnum.WEB_CHAT }),
    createSentMessageFromMessage: () => {
      const messageId = `msg_${shortId(12)}`;

      return sentMessageStub(messageId, conversationIdentifier);
    },
  } as unknown as Thread;
}

export function isWebChatThread(thread: Thread): boolean {
  const json = (thread as { toJSON?: () => { platform?: string } }).toJSON?.();

  return json?.platform === AgentPlatformEnum.WEB_CHAT;
}
