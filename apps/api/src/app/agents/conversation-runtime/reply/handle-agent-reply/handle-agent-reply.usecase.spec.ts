import { BadRequestException } from '@nestjs/common';
import { ConversationParticipantTypeEnum } from '@novu/dal';
import { HITL_APPROVE_WORKFLOW_ID } from '@novu/framework';
import { expect } from 'chai';
import sinon from 'sinon';
import { HandleAgentReply } from './handle-agent-reply.usecase';

describe('HandleAgentReply - active-conversation counting', () => {
  function setup() {
    const conversation = {
      _id: 'conv1',
      _agentId: 'agent1',
      participants: [{ type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub-1' }],
    };
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
      persistTriggerSignal: sinon.stub().resolves(undefined),
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
    const featureFlagsService = { getFlag: sinon.stub().resolves(true) };

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
      parseEventRequest,
      conversationService,
      featureFlagsService,
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
    const { usecase, baseCommand, outboundGateway } = setup();

    await usecase.execute({
      ...baseCommand,
      deleteMessages: [{ messageId: 'msg-abc' }, { messageId: 'msg-def' }],
    } as any);

    expect(outboundGateway.deliver.called).to.equal(false);
    expect(outboundGateway.deleteInConversation.callCount).to.equal(2);
    expect(outboundGateway.deleteInConversation.getCall(0).args[3]).to.equal('msg-abc');
    expect(outboundGateway.deleteInConversation.getCall(1).args[3]).to.equal('msg-def');
  });

  it('routes ctx.trigger workflows through the current agent via agentId override', async () => {
    const { usecase, baseCommand, parseEventRequest } = setup();

    await usecase.execute({
      ...baseCommand,
      signals: [{ type: 'trigger', workflowId: 'approve', payload: { action: 'raise limit' } }],
    } as any);

    expect(parseEventRequest.execute.calledOnce).to.equal(true);
    expect(parseEventRequest.execute.firstCall.args[0].agentId).to.equal('agent-1');
    expect(parseEventRequest.execute.firstCall.args[0].identifier).to.equal('approve');
    expect(parseEventRequest.execute.firstCall.args[0].overrides).to.deep.equal({});
  });

  it('forwards overrides from the trigger signal without inferring Slack thread_ts', async () => {
    const { usecase, baseCommand, parseEventRequest, conversationService } = setup();
    conversationService.getPrimaryChannel.returns({
      platform: 'slack',
      platformThreadId: 'slack:D123:1712345678.000100',
      firstPlatformMessageId: 'msg1',
    });

    await usecase.execute({
      ...baseCommand,
      signals: [
        {
          type: 'trigger',
          workflowId: 'approve',
          payload: { action: 'raise limit' },
          overrides: { slack: { thread_ts: '1712345678.000100' }, email: { from: 'agent@novu.co' } },
        },
      ],
    } as any);

    expect(parseEventRequest.execute.firstCall.args[0].overrides).to.deep.equal({
      slack: { thread_ts: '1712345678.000100' },
      email: { from: 'agent@novu.co' },
    });
  });

  it('skips HITL trigger workflows when agent-initiated messages are disabled', async () => {
    const { usecase, baseCommand, parseEventRequest, featureFlagsService } = setup();
    featureFlagsService.getFlag.resolves(false);

    await usecase.execute({
      ...baseCommand,
      signals: [{ type: 'trigger', workflowId: HITL_APPROVE_WORKFLOW_ID, payload: { action: 'raise limit' } }],
    } as any);

    expect(parseEventRequest.execute.called).to.equal(false);
  });
});
