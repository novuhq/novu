import { BadRequestException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { HandleAgentReply } from './handle-agent-reply.usecase';

describe('HandleAgentReply - active-conversation counting', () => {
  function setup() {
    const conversation = { _id: 'conv1', _agentId: 'agent1', participants: [] };
    const channel = { platform: 'whatsapp', platformThreadId: 'thread1', firstPlatformMessageId: 'msg1' };

    const agentRepository = {
      findOne: sinon.stub().resolves({ _id: 'agent1', name: 'Agent', identifier: 'agent-1' }),
    };
    const subscriberRepository = { findBySubscriberId: sinon.stub().resolves(null) };
    const bridgeExecutor = { execute: sinon.stub().resolves(undefined) };
    // Managed config so the bridge-only inboundAck path is skipped.
    const agentConfigResolver = { resolve: sinon.stub().resolves({ isManaged: true, platform: 'whatsapp' }) };
    const conversationService = {
      getConversation: sinon.stub().resolves(conversation),
      getPrimaryChannel: sinon.stub().returns(channel),
      persistToolApprovalRequest: sinon.stub().resolves({ _id: 'act-1' }),
      linkToolApprovalRequestCard: sinon.stub().resolves(undefined),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), error: sinon.stub() };
    const parseEventRequest = { execute: sinon.stub().resolves({ transactionId: 'txn1' }) };
    const analyticsService = { track: sinon.stub() };
    const outboundGateway = {
      deliver: sinon.stub().resolves({ messageId: 'm1', platformThreadId: 'thread1' }),
      deleteInConversation: sinon.stub().resolves(undefined),
    };
    const inboundAck = { onBridgeReplyDelivered: sinon.stub().resolves(undefined) };
    const conversationActivation = {
      assertOutboundWithinLimit: sinon.stub().resolves(undefined),
      registerEngagement: sinon.stub().resolves(false),
    };
    const createConversationInteraction = { execute: sinon.stub().resolves(undefined) };
    const featureFlagsService = { getFlag: sinon.stub().resolves(false) };

    const usecase = new HandleAgentReply(
      agentRepository as any,
      subscriberRepository as any,
      bridgeExecutor as any,
      agentConfigResolver as any,
      conversationService as any,
      logger as any,
      parseEventRequest as any,
      analyticsService as any,
      outboundGateway as any,
      inboundAck as any,
      conversationActivation as any,
      createConversationInteraction as any,
      featureFlagsService as any
    );

    const baseCommand = {
      userId: 'user1',
      environmentId: 'env1',
      organizationId: 'org1',
      conversationId: 'conv1',
      agentIdentifier: 'agent-1',
      integrationIdentifier: 'wa-main',
    };

    return {
      usecase,
      baseCommand,
      outboundGateway,
      conversationActivation,
      conversation,
      createConversationInteraction,
      featureFlagsService,
      conversationService,
      channel,
    };
  }

  it('counts an active conversation for a normal agent reply', async () => {
    const { usecase, baseCommand, outboundGateway, conversationActivation } = setup();

    await usecase.execute({ ...baseCommand, reply: { markdown: 'hi' } } as any);

    expect(outboundGateway.deliver.calledOnce).to.equal(true);
    expect(conversationActivation.assertOutboundWithinLimit.calledOnce).to.equal(true);
    expect(conversationActivation.registerEngagement.calledOnce).to.equal(true);
  });

  it('delivers a system-generated reply without counting or gating', async () => {
    const { usecase, baseCommand, outboundGateway, conversationActivation } = setup();

    await usecase.execute({ ...baseCommand, reply: { markdown: 'session failed' }, isSystemGenerated: true } as any);

    expect(outboundGateway.deliver.calledOnce).to.equal(true);
    expect(conversationActivation.assertOutboundWithinLimit.called).to.equal(false);
    expect(conversationActivation.registerEngagement.called).to.equal(false);
  });

  it('delivers generic copy when bridge reports error: true', async () => {
    const { usecase, baseCommand, outboundGateway, conversationActivation } = setup();

    await usecase.execute({ ...baseCommand, error: true } as any);

    expect(outboundGateway.deliver.calledOnce).to.equal(true);
    expect(outboundGateway.deliver.firstCall.args[1].markdown).to.include('Something went wrong');
    expect(conversationActivation.assertOutboundWithinLimit.called).to.equal(false);
    expect(conversationActivation.registerEngagement.called).to.equal(false);
  });

  it('rejects error combined with other reply operations', async () => {
    const { usecase, baseCommand } = setup();

    try {
      await usecase.execute({ ...baseCommand, error: true, toolResults: [{ toolCallId: 'x', result: 'y' }] } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
    }
  });

  it('deletes platform messages for a deleteMessages-only request', async () => {
    const { usecase, baseCommand, outboundGateway, conversationActivation } = setup();

    await usecase.execute({
      ...baseCommand,
      deleteMessages: [{ messageId: 'msg-abc' }, { messageId: 'msg-def' }],
    } as any);

    expect(outboundGateway.deliver.called).to.equal(false);
    expect(conversationActivation.assertOutboundWithinLimit.called).to.equal(false);
    expect(outboundGateway.deleteInConversation.callCount).to.equal(2);
    expect(outboundGateway.deleteInConversation.getCall(0).args[3]).to.equal('msg-abc');
    expect(outboundGateway.deleteInConversation.getCall(1).args[3]).to.equal('msg-def');
  });

  it('skips human signals when IS_AGENT_HUMAN_HITL_ENABLED is off', async () => {
    const { usecase, baseCommand, createConversationInteraction, featureFlagsService } = setup();
    featureFlagsService.getFlag.resolves(false);

    await usecase.execute({
      ...baseCommand,
      signals: [{ type: 'human', kind: 'approve', prompt: 'Deploy?', requestId: 'hr_1' }],
    } as any);

    expect(createConversationInteraction.execute.called).to.equal(false);
  });

  it('creates a conversation interaction for each human signal when the flag is on', async () => {
    const {
      usecase,
      baseCommand,
      conversation,
      createConversationInteraction,
      featureFlagsService,
      conversationActivation,
    } = setup();
    featureFlagsService.getFlag.resolves(true);
    (conversation as { participants: Array<{ type: string; id: string }> }).participants = [
      { type: 'subscriber', id: 'sub-1' },
    ];

    await usecase.execute({
      ...baseCommand,
      signals: [
        {
          type: 'human',
          kind: 'approve',
          prompt: 'Deploy?',
          requestId: 'hr_1',
          to: ['alice', 'bob'],
          card: { title: 'Deploy?' },
        },
        { type: 'human', kind: 'ask', prompt: 'Which env?', requestId: 'hr_2', card: { title: 'Which env?' } },
      ],
    } as any);

    expect(conversationActivation.assertOutboundWithinLimit.calledOnce).to.equal(true);
    expect(conversationActivation.registerEngagement.calledOnce).to.equal(true);
    expect(createConversationInteraction.execute.calledTwice).to.equal(true);
    expect(createConversationInteraction.execute.firstCall.args[0].kind).to.equal('approve');
    expect(createConversationInteraction.execute.firstCall.args[0].requestId).to.equal('hr_1');
    expect(createConversationInteraction.execute.firstCall.args[0].to).to.deep.equal(['alice', 'bob']);
    expect(createConversationInteraction.execute.firstCall.args[0].card.title).to.equal('Deploy?');
    expect(createConversationInteraction.execute.secondCall.args[0].kind).to.equal('ask');
    expect(createConversationInteraction.execute.secondCall.args[0].card.title).to.equal('Which env?');
  });

  it('passes a posted card element through as card without inventing chrome', async () => {
    const { usecase, baseCommand, conversation, createConversationInteraction, featureFlagsService } = setup();
    featureFlagsService.getFlag.resolves(true);
    (conversation as { participants: Array<{ type: string; id: string }> }).participants = [
      { type: 'subscriber', id: 'sub-1' },
    ];
    const card = { type: 'card', title: 'Refund $25?', children: [] };

    await usecase.execute({
      ...baseCommand,
      signals: [
        {
          type: 'human',
          kind: 'approve',
          requestId: 'hr_1',
          actionIdentifier: 'hr_1',
          card,
        },
      ],
    } as any);

    expect(createConversationInteraction.execute.firstCall.args[0].card).to.deep.equal(card);
    expect(createConversationInteraction.execute.firstCall.args[0].content).to.equal(undefined);
    expect(createConversationInteraction.execute.firstCall.args[0].actionIdentifier).to.equal('hr_1');
  });

  it('does not create a human signal when the outbound limit is reached', async () => {
    const {
      usecase,
      baseCommand,
      conversation,
      createConversationInteraction,
      featureFlagsService,
      conversationActivation,
    } = setup();
    featureFlagsService.getFlag.resolves(true);
    (conversation as { participants: Array<{ type: string; id: string }> }).participants = [
      { type: 'subscriber', id: 'sub-1' },
    ];
    conversationActivation.assertOutboundWithinLimit.rejects(new Error('plan limit'));

    try {
      await usecase.execute({
        ...baseCommand,
        signals: [{ type: 'human', kind: 'approve', prompt: 'Deploy?', requestId: 'hr_1' }],
      } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).to.equal('plan limit');
    }
    expect(createConversationInteraction.execute.called).to.equal(false);
    expect(conversationActivation.registerEngagement.called).to.equal(false);
  });

  it('creates a HITL tool-approval row when the flag is on', async () => {
    const {
      usecase,
      baseCommand,
      createConversationInteraction,
      featureFlagsService,
      conversationService,
      conversation,
      channel,
      conversationActivation,
    } = setup();
    channel.platform = 'web_chat';
    featureFlagsService.getFlag.resolves(true);
    (conversation as { participants: Array<{ type: string; id: string }> }).participants = [
      { type: 'subscriber', id: 'sub-1' },
    ];
    createConversationInteraction.execute.resolves({
      _id: 'hi1',
      identifier: 'hi_1',
      subscriberIds: ['sub-1'],
    });

    await usecase.execute({
      ...baseCommand,
      toolApprovalRequest: {
        approvalId: 'apr_1',
        toolCallId: 'tc_1',
        name: 'issueRefund',
        input: { orderId: 'ORD-1' },
        mcpServerName: 'Stripe',
        approveActionId: 'mcp-approval:approve:apr_1',
        denyActionId: 'mcp-approval:deny:apr_1',
      },
      reply: { toolApprovalCard: { type: 'tool-approval-card' } },
    } as any);

    expect(createConversationInteraction.execute.calledOnce).to.equal(true);
    const created = createConversationInteraction.execute.firstCall.args[0];
    expect(created.kind).to.equal('approve');
    expect(created.requestId).to.equal('tool_approval:apr_1');
    expect(created.skipDelivery).to.equal(true);
    expect(created.card.extraActions).to.deep.equal([
      { id: 'trust-tool', label: 'Always allow this tool' },
      { id: 'trust-server', label: 'Always allow Stripe' },
    ]);
    expect(conversationService.persistToolApprovalRequest.firstCall.args[0].approveActionId).to.equal(
      'mcp-approval:approve:apr_1'
    );
    expect(conversationService.persistToolApprovalRequest.firstCall.args[0].denyActionId).to.equal(
      'mcp-approval:deny:apr_1'
    );
    expect(conversationActivation.assertOutboundWithinLimit.calledOnce).to.equal(true);
    expect(conversationActivation.registerEngagement.calledOnce).to.equal(true);
  });

  it('delivers the author action ids and stamps HITL delivery on Slack when the flag is on', async () => {
    const {
      usecase,
      baseCommand,
      createConversationInteraction,
      featureFlagsService,
      conversationService,
      conversation,
      channel,
      outboundGateway,
    } = setup();
    channel.platform = 'slack';
    featureFlagsService.getFlag.resolves(true);
    (conversation as { participants: Array<{ type: string; id: string }> }).participants = [
      { type: 'subscriber', id: 'sub-1' },
    ];
    createConversationInteraction.execute.resolves({
      _id: 'hi1',
      identifier: 'hi_1',
      subscriberIds: ['sub-1'],
      deliveries: [{ platformMessageId: 'msg-hitl' }],
    });

    await usecase.execute({
      ...baseCommand,
      toolApprovalRequest: {
        approvalId: 'apr_1',
        toolCallId: 'tc_1',
        name: 'issueRefund',
        approveActionId: 'tool-approval:approve:apr_1',
        denyActionId: 'tool-approval:deny:apr_1',
      },
      reply: { toolApprovalCard: { type: 'tool-approval-card' } },
    } as any);

    expect(createConversationInteraction.execute.calledOnce).to.equal(true);
    const created = createConversationInteraction.execute.firstCall.args[0];
    expect(created.skipDelivery).to.equal(undefined);
    expect(created.card.type).to.equal('card');
    expect(created.card).to.not.have.property('extraActions');
    expect(conversationService.persistToolApprovalRequest.firstCall.args[0].approveActionId).to.equal(
      'tool-approval:approve:apr_1'
    );
    expect(outboundGateway.deliver.called).to.equal(false);
    expect(conversationService.linkToolApprovalRequestCard.calledOnce).to.equal(true);
    expect(conversationService.linkToolApprovalRequestCard.firstCall.args[0]).to.include({
      activityId: 'act-1',
      platformMessageId: 'msg-hitl',
    });
  });

  it('does not deliver the approval card when HITL create fails', async () => {
    const {
      usecase,
      baseCommand,
      createConversationInteraction,
      featureFlagsService,
      conversationService,
      outboundGateway,
      conversationActivation,
    } = setup();
    featureFlagsService.getFlag.resolves(true);
    createConversationInteraction.execute.rejects(new Error('create failed'));

    await usecase.execute({
      ...baseCommand,
      toolApprovalRequest: {
        approvalId: 'apr_1',
        toolCallId: 'tc_1',
        name: 'issueRefund',
        approveActionId: 'tool-approval:approve:apr_1',
        denyActionId: 'tool-approval:deny:apr_1',
      },
      reply: { toolApprovalCard: { type: 'tool-approval-card' } },
    } as any);

    expect(conversationService.persistToolApprovalRequest.called).to.equal(false);
    expect(outboundGateway.deliver.called).to.equal(false);
    expect(conversationActivation.registerEngagement.called).to.equal(false);
  });

  it('does not create a HITL tool-approval row when the outbound limit is reached', async () => {
    const { usecase, baseCommand, createConversationInteraction, featureFlagsService, conversationActivation } =
      setup();
    featureFlagsService.getFlag.resolves(true);
    conversationActivation.assertOutboundWithinLimit.rejects(new Error('plan limit'));

    try {
      await usecase.execute({
        ...baseCommand,
        toolApprovalRequest: {
          approvalId: 'apr_1',
          toolCallId: 'tc_1',
          name: 'issueRefund',
          approveActionId: 'mcp-approval:approve:apr_1',
          denyActionId: 'mcp-approval:deny:apr_1',
        },
        reply: { toolApprovalCard: { type: 'tool-approval-card' } },
      } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).to.equal('plan limit');
    }
    expect(createConversationInteraction.execute.called).to.equal(false);
    expect(conversationActivation.registerEngagement.called).to.equal(false);
  });

  it('does not create a HITL tool-approval row when the flag is off', async () => {
    const {
      usecase,
      baseCommand,
      createConversationInteraction,
      featureFlagsService,
      conversationService,
      channel,
      conversationActivation,
    } = setup();
    channel.platform = 'web_chat';
    featureFlagsService.getFlag.resolves(false);

    await usecase.execute({
      ...baseCommand,
      toolApprovalRequest: {
        approvalId: 'apr_1',
        toolCallId: 'tc_1',
        name: 'issueRefund',
        approveActionId: 'tool-approval:approve:apr_1',
        denyActionId: 'tool-approval:deny:apr_1',
      },
      reply: { toolApprovalCard: { type: 'tool-approval-card' } },
    } as any);

    expect(createConversationInteraction.execute.called).to.equal(false);
    expect(conversationActivation.assertOutboundWithinLimit.calledOnce).to.equal(true);
    expect(conversationService.persistToolApprovalRequest.calledOnce).to.equal(true);
    expect(conversationService.persistToolApprovalRequest.firstCall.args[0].approveActionId).to.equal(
      'tool-approval:approve:apr_1'
    );
  });
});
