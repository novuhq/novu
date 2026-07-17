import type { AgentBridgeRequest } from './agent.types';

/** Test-only fixture: a minimal, valid `AgentBridgeRequest` for an `onMessage` turn. */
export function createMockBridgeRequest(overrides?: Partial<AgentBridgeRequest>): AgentBridgeRequest {
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    deliveryId: 'del-123',
    event: 'onMessage',
    agentId: 'test-bot',
    replyUrl: 'https://api.novu.co/v1/agents/test-bot/reply',
    conversationId: 'conv-456',
    integrationIdentifier: 'slack-main',
    action: null,
    reaction: null,
    message: {
      text: 'Hello bot!',
      platformMessageId: 'msg-789',
      author: { userId: 'u1', fullName: 'Alice', userName: 'alice', isBot: false },
      timestamp: new Date().toISOString(),
    },
    conversation: {
      identifier: 'conv-456',
      status: 'active',
      metadata: {},
      messageCount: 1,
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    },
    subscriber: {
      subscriberId: 'sub-001',
      firstName: 'Alice',
      email: 'alice@example.com',
    },
    history: [],
    platform: 'slack',
    platformContext: { threadId: 't1', channelId: 'c1', isDM: false },
    ...overrides,
  };
}
