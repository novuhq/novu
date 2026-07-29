import { shortId } from '@novu/application-generic';
import type { Message, Thread } from 'chat';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';

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
 * REST → inbound-turn bridge. `thread.post()` returns durable-shaped ids; persistence
 * for gate/runtime replies is handled by `OutboundGateway.replyOnThread({ persist })`.
 */
export function buildWebChatThread(conversationIdentifier: string): Thread {
  return {
    id: conversationIdentifier,
    channelId: conversationIdentifier,
    isDM: true,
    startTyping: async () => {},
    subscribe: async () => {},
    post: async () => {
      const messageId = `msg_${shortId(12)}`;

      return sentMessageStub(messageId, conversationIdentifier);
    },
    toJSON: () => ({ id: conversationIdentifier, platform: AgentPlatformEnum.WEB_CHAT }),
    createSentMessageFromMessage: () => {
      const messageId = `msg_${shortId(12)}`;

      return sentMessageStub(messageId, conversationIdentifier);
    },
  } as unknown as Thread;
}
