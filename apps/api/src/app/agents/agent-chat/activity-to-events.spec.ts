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
      platform: 'agent_chat',
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

  it('maps stored Card trees to protocol card content', () => {
    const card = {
      type: 'card',
      title: 'Support Agent',
      children: [{ type: 'text', content: 'How can I help?' }],
    };
    const envelopes = mapNewestFirstEventActivities(
      [
        activity({
          type: ConversationActivityTypeEnum.MESSAGE,
          identifier: 'msg_card0000001',
          platformMessageId: 'act_card0000001',
          sequence: 1,
          content: 'How can I help?',
          richContent: { card },
        }),
      ],
      context
    );

    expect(envelopes.map((envelope) => envelope.event)).to.deep.equal([
      {
        type: 'message',
        role: 'assistant',
        messageId: 'act_card0000001',
        content: { card },
        files: undefined,
      },
    ]);
  });

  it('uses immutable activity ids for approval request messages', () => {
    const envelopes = mapNewestFirstEventActivities(
      [
        activity({
          type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
          identifier: 'approval-activity-2',
          platformMessageId: 'platform-message-2',
          sequence: 2,
          toolData: {
            approvalId: 'approval-2',
            toolCallId: 'tool-use-2',
            toolName: 'secondTool',
          },
        }),
        activity({
          type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
          identifier: 'approval-activity-1',
          sequence: 1,
          toolData: {
            approvalId: 'approval-1',
            toolCallId: 'tool-use-1',
            toolName: 'firstTool',
          },
        }),
      ],
      context
    );

    expect(
      envelopes.map((envelope) =>
        envelope.event.type === 'tool-approval-request' ? envelope.event.messageId : undefined
      )
    ).to.deep.equal(['approval-activity-1', 'approval-activity-2']);
  });

  it('derives trust action ids at emit time for managed MCP approvals', () => {
    const envelopes = mapNewestFirstEventActivities(
      [
        activity({
          type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
          identifier: 'approval-activity-mcp',
          sequence: 1,
          toolData: {
            approvalId: 'call_1',
            toolCallId: 'call_1',
            toolName: 'create_issue',
            approveActionId: 'mcp-approval:approve:call_1',
            denyActionId: 'mcp-approval:deny:call_1',
            mcpServerName: 'GitHub',
          },
        }),
      ],
      context
    );

    expect(envelopes[0]?.event).to.deep.equal({
      type: 'tool-approval-request',
      messageId: 'approval-activity-mcp',
      approvalId: 'call_1',
      toolUseId: 'call_1',
      toolName: 'create_issue',
      input: undefined,
      approveActionId: 'mcp-approval:approve:call_1',
      denyActionId: 'mcp-approval:deny:call_1',
      trustToolActionId: 'mcp-approval:approve-tool:call_1:create_issue:GitHub',
      trustServerActionId: 'mcp-approval:approve-server:call_1:create_issue:GitHub',
      source: { type: 'mcp', serverName: 'GitHub' },
    });
  });

  it('derives trust action ids at emit time for managed direct approvals', () => {
    const envelopes = mapNewestFirstEventActivities(
      [
        activity({
          type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
          identifier: 'approval-activity-direct',
          sequence: 1,
          toolData: {
            approvalId: 'call_2',
            toolCallId: 'call_2',
            toolName: 'deleteOrder',
            approveActionId: 'direct-approval:approve:call_2',
            denyActionId: 'direct-approval:deny:call_2',
          },
        }),
      ],
      context
    );

    expect(envelopes[0]?.event).to.deep.equal({
      type: 'tool-approval-request',
      messageId: 'approval-activity-direct',
      approvalId: 'call_2',
      toolUseId: 'call_2',
      toolName: 'deleteOrder',
      input: undefined,
      approveActionId: 'direct-approval:approve:call_2',
      denyActionId: 'direct-approval:deny:call_2',
      trustToolActionId: 'direct-approval:approve-tool:call_2:deleteOrder',
      source: undefined,
    });
  });

  it('omits trust action ids for self-hosted approvals', () => {
    const envelopes = mapNewestFirstEventActivities(
      [
        activity({
          type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
          identifier: 'approval-activity-self-hosted',
          sequence: 1,
          toolData: {
            approvalId: 'apr_1',
            toolCallId: 'tool-use-1',
            toolName: 'runCommand',
            approveActionId: 'tool-approval:approve:apr_1',
            denyActionId: 'tool-approval:deny:apr_1',
          },
        }),
      ],
      context
    );

    expect(envelopes[0]?.event).to.deep.equal({
      type: 'tool-approval-request',
      messageId: 'approval-activity-self-hosted',
      approvalId: 'apr_1',
      toolUseId: 'tool-use-1',
      toolName: 'runCommand',
      input: undefined,
      approveActionId: 'tool-approval:approve:apr_1',
      denyActionId: 'tool-approval:deny:apr_1',
      source: undefined,
    });
  });
});
