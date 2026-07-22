import { ConversationActivityEntity, ConversationActivityTypeEnum } from '@novu/dal';
import { AGENT_EVENT_PROTOCOL_VERSION, type AgentEvent, type AgentEventEnvelope } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentEventContext, AgentEventSink } from './agent-event-sink.service';

function envelope(event: AgentEvent, overrides: Partial<AgentEventEnvelope> = {}): AgentEventEnvelope {
  return {
    version: AGENT_EVENT_PROTOCOL_VERSION,
    conversationId: 'conv-1',
    agentId: 'support-agent',
    runId: 'run-1',
    turnId: 'turn-1',
    sequence: 1,
    timestamp: new Date().toISOString(),
    event,
    ...overrides,
  };
}

function baseContext(overrides: Partial<AgentEventContext> = {}): AgentEventContext {
  return {
    userId: 'org-1',
    environmentId: 'env-1',
    organizationId: 'org-1',
    conversationId: 'conv-1',
    agentIdentifier: 'support-agent',
    integrationIdentifier: 'slack-main',
    agentId: 'mongo-agent-1',
    platform: 'slack' as AgentEventContext['platform'],
    platformThreadId: 'thread-1',
    ...overrides,
  };
}

describe('AgentEventSink', () => {
  function setup() {
    const handleAgentReply = { execute: sinon.stub().resolves(null) };
    const handlePlanProgress = { execute: sinon.stub().resolves(undefined) };
    const handlePendingToolApprovals = { execute: sinon.stub().resolves(undefined) };
    const inboundAck = { onManagedTurnComplete: sinon.stub().resolves(undefined) };
    const demoQuota = { recordUsage: sinon.stub().resolves(undefined) };
    const conversationRepository = { clearExternalSessionId: sinon.stub().resolves(undefined) };
    const subscriberRepository = { findBySubscriberId: sinon.stub().resolves(null) };
    const agentMcpServerRepository = {};
    const mcpConnectionRepository = { update: sinon.stub().resolves(undefined) };
    const activityRepository = { findOne: sinon.stub().resolves(null) };
    const outboundGateway = {
      removeReaction: sinon.stub().resolves(undefined),
      stopTypingInConversation: sinon.stub().resolves(undefined),
    };
    const conversationService = {
      getHistory: sinon.stub().resolves([]),
      getConversation: sinon.stub().resolves({ _id: 'conv-1', _agentId: 'mongo-agent-1' }),
    };
    const logger = {
      setContext: sinon.stub(),
      debug: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      info: sinon.stub(),
    };

    const sink = new AgentEventSink(
      handleAgentReply as any,
      handlePlanProgress as any,
      handlePendingToolApprovals as any,
      inboundAck as any,
      demoQuota as any,
      conversationRepository as any,
      subscriberRepository as any,
      agentMcpServerRepository as any,
      mcpConnectionRepository as any,
      activityRepository as any,
      outboundGateway as any,
      conversationService as any,
      logger as any
    );

    return {
      sink,
      handleAgentReply,
      handlePlanProgress,
      handlePendingToolApprovals,
      inboundAck,
      activityRepository,
      outboundGateway,
      conversationService,
      logger,
    };
  }

  it('returns duplicate and skips dispatch when message identifier already exists', async () => {
    const { sink, handleAgentReply, activityRepository } = setup();
    activityRepository.findOne.resolves({ identifier: 'msg-existing' });

    const outcome = await sink.ingest(
      envelope({ type: 'message', messageId: 'msg-existing', content: { markdown: 'hello' } }),
      baseContext()
    );

    expect(outcome).to.equal('duplicate');
    expect(handleAgentReply.execute.called).to.equal(false);
  });

  it('dispatches message with activityIdentifier and mapped content', async () => {
    const { sink, handleAgentReply } = setup();

    await sink.ingest(
      envelope({
        type: 'message',
        messageId: 'msg-1',
        content: { markdown: 'hello' },
        files: [{ fileId: 'f1', name: 'a.txt', mediaType: 'text/plain', data: 'aGk=' }],
      }),
      baseContext()
    );

    expect(handleAgentReply.execute.calledOnce).to.equal(true);
    const command = handleAgentReply.execute.firstCall.args[0];
    expect(command.activityIdentifier).to.equal('msg-1');
    expect(command.reply.markdown).to.equal('hello');
    expect(command.reply.files[0].filename).to.equal('a.txt');
  });

  it('resolves channel.edit by client message id and dispatches edit', async () => {
    const { sink, handleAgentReply, activityRepository } = setup();
    activityRepository.findOne.resolves({
      identifier: 'msg-client',
      platformMessageId: 'platform-msg-1',
    } as ConversationActivityEntity);

    await sink.ingest(
      envelope({
        type: 'channel.edit',
        messageId: 'msg-client',
        content: { markdown: 'updated' },
      }),
      baseContext()
    );

    expect(handleAgentReply.execute.calledOnce).to.equal(true);
    const command = handleAgentReply.execute.firstCall.args[0];
    expect(command.edit.messageId).to.equal('platform-msg-1');
    expect(command.edit.content.markdown).to.equal('updated');
  });

  it('maps channel.typing off to stop typing command', async () => {
    const { sink, handleAgentReply } = setup();

    await sink.ingest(envelope({ type: 'channel.typing', state: 'off' }), baseContext());

    expect(handleAgentReply.execute.calledOnce).to.equal(true);
    expect(handleAgentReply.execute.firstCall.args[0].typing).to.equal('stop');
  });

  it('maps signal events to HandleAgentReply signals', async () => {
    const { sink, handleAgentReply } = setup();
    const signal = { type: 'metadata' as const, action: 'set' as const, key: 'foo', value: 'bar' };

    await sink.ingest(envelope({ type: 'signal', signal }), baseContext());

    expect(handleAgentReply.execute.calledOnce).to.equal(true);
    expect(handleAgentReply.execute.firstCall.args[0].signals).to.deep.equal([signal]);
  });

  it('routes bridge tool-use-result to toolResults when sessionId is absent', async () => {
    const { sink, handleAgentReply, handlePlanProgress } = setup();

    await sink.ingest(
      envelope({
        type: 'tool-use-result',
        toolUseId: 'tool-1',
        content: [
          { type: 'text', text: 'done' },
          { type: 'json', value: { ok: true } },
        ],
      }),
      baseContext({ sessionId: undefined })
    );

    expect(handleAgentReply.execute.calledOnce).to.equal(true);
    expect(handlePlanProgress.execute.called).to.equal(false);
    const toolResults = handleAgentReply.execute.firstCall.args[0].toolResults;
    expect(toolResults[0].toolCallId).to.equal('tool-1');
    expect(toolResults[0].output).to.deep.equal({ ok: true });
    expect(toolResults[0].preview).to.equal('done');
  });

  it('persists tool-approval-request and auto-delivers default card in a single-ingest call', async () => {
    const { sink, handleAgentReply } = setup();

    await sink.ingest(
      envelope({
        type: 'tool-approval-request',
        approvalId: 'appr-1',
        toolUseId: 'tool-1',
        toolName: 'deleteDatabase',
        input: { confirm: true },
      }),
      baseContext({ sessionId: undefined })
    );

    expect(handleAgentReply.execute.calledOnce).to.equal(true);
    const command = handleAgentReply.execute.firstCall.args[0];
    expect(command.toolApprovalRequest.approvalId).to.equal('appr-1');
    expect(command.reply.toolApprovalCard).to.deep.equal({});
  });

  it('skips auto-deliver when a message follows the approval in the same batch', async () => {
    const { sink, handleAgentReply } = setup();

    await sink.ingestMany(
      [
        envelope({
          type: 'tool-approval-request',
          approvalId: 'appr-1',
          toolUseId: 'tool-1',
          toolName: 'deleteDatabase',
        }),
        envelope({
          type: 'message',
          messageId: 'msg-custom',
          content: { card: { type: 'card', elements: [] } },
        }),
      ],
      baseContext({ sessionId: undefined })
    );

    expect(handleAgentReply.execute.callCount).to.equal(2);
    expect(handleAgentReply.execute.firstCall.args[0].reply).to.equal(undefined);
    expect(handleAgentReply.execute.secondCall.args[0].reply.card).to.deep.equal({ type: 'card', elements: [] });
  });

  it('falls back to unresolved approvals from history on paused run-finish with empty batch buffer', async () => {
    const { sink, handlePendingToolApprovals, conversationService } = setup();
    const pending = {
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
      toolData: {
        approvalId: 'appr-db',
        toolCallId: 'tool-db',
        toolName: 'issueRefund',
        input: { amount: 10 },
      },
    } as ConversationActivityEntity;
    conversationService.getHistory.resolves([pending]);

    await sink.ingestMany(
      [envelope({ type: 'run-finish', outcome: 'paused' })],
      baseContext({ sessionId: 'session-1', subscriberId: 'sub-1' })
    );

    expect(conversationService.getHistory.calledOnce).to.equal(true);
    expect(handlePendingToolApprovals.execute.calledOnce).to.equal(true);
    const response = handlePendingToolApprovals.execute.firstCall.args[0].response;
    expect(response.actionsRequired).to.have.length(1);
    expect(response.actionsRequired[0].toolUseId).to.equal('tool-db');
  });

  it('dispatches resolve events through HandleAgentReply', async () => {
    const { sink, handleAgentReply } = setup();

    await sink.ingest(envelope({ type: 'resolve', summary: 'done' }), baseContext());

    expect(handleAgentReply.execute.calledOnce).to.equal(true);
    expect(handleAgentReply.execute.firstCall.args[0].resolve).to.deep.equal({ summary: 'done' });
  });

  it('calls removeReaction directly for channel.reaction op remove', async () => {
    const { sink, handleAgentReply, activityRepository, outboundGateway } = setup();
    activityRepository.findOne.resolves({
      identifier: 'msg-client',
      platformMessageId: 'platform-msg-1',
    } as ConversationActivityEntity);

    await sink.ingest(
      envelope({ type: 'channel.reaction', messageId: 'msg-client', emoji: 'thumbsup', op: 'remove' }),
      baseContext()
    );

    expect(handleAgentReply.execute.called).to.equal(false);
    expect(outboundGateway.removeReaction.calledOnce).to.equal(true);
    expect(outboundGateway.removeReaction.firstCall.args[4]).to.equal('platform-msg-1');
    expect(outboundGateway.removeReaction.firstCall.args[5]).to.equal('thumbsup');
  });

  it('stops typing on bridge run-finish for non-managed context', async () => {
    const { sink, outboundGateway } = setup();

    await sink.ingest(envelope({ type: 'run-finish', outcome: 'completed' }), baseContext({ sessionId: undefined }));

    expect(outboundGateway.stopTypingInConversation.calledOnce).to.equal(true);
  });
});
