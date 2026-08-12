import {
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
} from '@novu/dal';
import { expect } from 'chai';
import { mapNewestFirstEventActivities } from './activity-to-events';

describe('activity-to-events run lifecycle', () => {
  const context = {
    conversationId: 'conv-mongo-id',
    conversationIdentifier: 'conv_public',
    agentIdentifier: 'agent_1',
  };

  function activity(
    overrides: Partial<ConversationActivityEntity> &
      Pick<ConversationActivityEntity, 'type' | 'sequence' | 'identifier'>
  ): ConversationActivityEntity {
    return {
      _id: 'act-1',
      _conversationId: 'conv-mongo-id',
      content: '',
      platform: 'web_chat',
      _integrationId: 'int-1',
      platformThreadId: 'thread-1',
      senderType: ConversationActivitySenderTypeEnum.AGENT,
      senderId: 'agent_1',
      _environmentId: 'env-1',
      _organizationId: 'org-1',
      createdAt: '2026-08-11T00:00:00.000Z',
      ...overrides,
    };
  }

  it('maps run-start / run-finish / run-error activities to protocol events', () => {
    const envelopes = mapNewestFirstEventActivities(
      [
        activity({
          type: ConversationActivityTypeEnum.RUN_ERROR,
          identifier: 'run_run-1_error',
          sequence: 3,
          content: 'boom',
          richContent: { lifecycle: { message: 'boom', code: 'failed' } },
        }),
        activity({
          type: ConversationActivityTypeEnum.RUN_FINISH,
          identifier: 'run_run-1_finish',
          sequence: 2,
          richContent: { lifecycle: { outcome: 'completed', finishReason: 'stop' } },
        }),
        activity({
          type: ConversationActivityTypeEnum.RUN_START,
          identifier: 'run_run-1_start',
          sequence: 1,
        }),
      ],
      context
    );

    expect(envelopes.map((envelope) => envelope.event)).to.deep.equal([
      { type: 'run-start' },
      { type: 'run-finish', outcome: 'completed', finishReason: 'stop' },
      { type: 'run-error', message: 'boom', code: 'failed' },
    ]);
    expect(envelopes.every((envelope) => envelope.runId === 'run-1')).to.equal(true);
  });

  it('maps MCP connection activities to protocol events', () => {
    const envelopes = mapNewestFirstEventActivities(
      [
        activity({
          type: ConversationActivityTypeEnum.MCP_CONNECTION_RESULT,
          identifier: 'mcp-connection:connect-1:result',
          sequence: 2,
          richContent: {
            mcpConnection: {
              actionId: 'connect-1',
              mcpId: 'stripe',
              status: 'connected',
            },
          },
        }),
        activity({
          type: ConversationActivityTypeEnum.MCP_CONNECTION_REQUEST,
          identifier: 'mcp-connection:connect-1:request',
          sequence: 1,
          richContent: {
            mcpConnection: {
              actionId: 'connect-1',
              mcpId: 'stripe',
              displayName: 'Stripe',
              authorizeUrl: 'https://example.com/authorize',
            },
          },
        }),
      ],
      context
    );

    expect(envelopes.map((envelope) => envelope.event)).to.deep.equal([
      {
        type: 'mcp-connection-request',
        actionId: 'connect-1',
        mcpId: 'stripe',
        displayName: 'Stripe',
        authorizeUrl: 'https://example.com/authorize',
        authorizeUrlWithAutoApprove: undefined,
      },
      {
        type: 'mcp-connection-result',
        actionId: 'connect-1',
        mcpId: 'stripe',
        status: 'connected',
        message: undefined,
      },
    ]);
  });
});
