import { ConversationActivitySenderTypeEnum } from '@novu/dal';
import { HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { ResumeToolApprovalFromHitl } from './resume-tool-approval-from-hitl.usecase';

describe('ResumeToolApprovalFromHitl', () => {
  function setup() {
    const conversationService = {
      getConversation: sinon.stub().resolves({ _id: 'conv1' }),
      getPrimaryChannel: sinon.stub().returns({ platform: 'slack', platformThreadId: 'thread-1' }),
      persistToolApprovalDecision: sinon.stub().resolves(undefined),
      listForView: sinon.stub().resolves({
        data: [
          {
            toolData: { approvalId: 'apr_1', toolName: 'issueRefund', mcpServerName: 'Stripe' },
          },
        ],
        hasMore: false,
      }),
    };
    const agentRepository = {
      findOne: sinon.stub().resolves({ identifier: 'ship-bot', runtime: 'managed' }),
    };
    const confirmToolApproval = { execute: sinon.stub().resolves(undefined) };
    const outboundGateway = { editInConversation: sinon.stub().resolves(undefined) };
    const integrationRepository = {
      findOne: sinon.stub().resolves({ identifier: 'web-chat-main' }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const usecase = new ResumeToolApprovalFromHitl(
      conversationService as any,
      agentRepository as any,
      confirmToolApproval as any,
      outboundGateway as any,
      integrationRepository as any,
      logger as any
    );

    return {
      usecase,
      conversationService,
      confirmToolApproval,
      agentRepository,
      outboundGateway,
      integrationRepository,
    };
  }

  const interaction = {
    identifier: 'hi_1',
    requestId: 'tool_approval:apr_1',
    _conversationId: 'conv1',
    _environmentId: 'env1',
    _organizationId: 'org1',
    _agentId: 'agent1',
    status: HumanInteractionStatusEnum.APPROVED,
    response: { optionId: 'trust-tool', respondedBySubscriberId: 'sub-1' },
    deliveries: [
      {
        subscriberId: 'sub-1',
        integrationIdentifier: 'slack-main',
        platform: 'slack',
        platformThreadId: 'thread-1',
        platformMessageId: 'msg-1',
      },
    ],
  };

  it('persists the decision and confirms managed approval with trust from optionId', async () => {
    const { usecase, conversationService, confirmToolApproval } = setup();

    await usecase.execute(interaction as any);

    expect(conversationService.persistToolApprovalDecision.calledOnce).to.equal(true);
    expect(conversationService.persistToolApprovalDecision.firstCall.args[0]).to.include({
      approvalId: 'apr_1',
      approved: true,
      toolName: 'issueRefund',
      actorType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
      actorId: 'sub-1',
    });
    expect(confirmToolApproval.execute.calledOnce).to.equal(true);
    const command = confirmToolApproval.execute.firstCall.args[0];
    expect(command.skipDeleteCard).to.equal(undefined);
    expect(command.sourceMessageId).to.equal('msg-1');
    expect(command.parsed).to.deep.include({
      toolUseId: 'apr_1',
      approved: true,
    });
    expect(command.parsed.trust).to.deep.equal({
      scope: 'tool',
      toolName: 'issueRefund',
      mcpServerName: 'Stripe',
    });
    expect(command.platform).to.equal(AgentPlatformEnum.SLACK);
  });

  it('resolves the channel integration identifier when the HITL row has no delivery (managed web chat)', async () => {
    const { usecase, conversationService, confirmToolApproval, integrationRepository } = setup();
    conversationService.getPrimaryChannel.returns({
      platform: 'web_chat',
      platformThreadId: 'web_chat:thread-1',
      _integrationId: 'int-mongo-1',
    });

    await usecase.execute({
      ...interaction,
      response: { optionId: 'approve', respondedBySubscriberId: 'sub-1' },
      deliveries: [],
    } as any);

    expect(integrationRepository.findOne.calledOnce).to.equal(true);
    expect(confirmToolApproval.execute.calledOnce).to.equal(true);
    const command = confirmToolApproval.execute.firstCall.args[0];
    expect(command.integrationIdentifier).to.equal('web-chat-main');
    expect(command.platform).to.equal(AgentPlatformEnum.WEB_CHAT);
    expect(command.platformThreadId).to.equal('web_chat:thread-1');
  });

  it('skips managed confirm when the channel integration identifier cannot be resolved', async () => {
    const { usecase, confirmToolApproval, integrationRepository } = setup();
    integrationRepository.findOne.resolves(null);

    await usecase.execute({
      ...interaction,
      response: { optionId: 'approve', respondedBySubscriberId: 'sub-1' },
      deliveries: [],
    } as any);

    expect(confirmToolApproval.execute.called).to.equal(false);
  });

  it('persists a denial, edits the card in place, and does not confirm for self-hosted agents', async () => {
    const { usecase, conversationService, confirmToolApproval, agentRepository, outboundGateway } = setup();
    agentRepository.findOne.resolves({ identifier: 'ship-bot', runtime: 'self-hosted' });

    await usecase.execute({
      ...interaction,
      status: HumanInteractionStatusEnum.DENIED,
      response: { optionId: 'deny', respondedBySubscriberId: 'sub-1' },
    } as any);

    expect(conversationService.persistToolApprovalDecision.firstCall.args[0].approved).to.equal(false);
    expect(confirmToolApproval.execute.called).to.equal(false);
    expect(outboundGateway.editInConversation.calledOnce).to.equal(true);
    expect(outboundGateway.editInConversation.firstCall.args[4]).to.equal('msg-1');
  });

  it('no-ops for novu_human request ids', async () => {
    const { usecase, conversationService, confirmToolApproval } = setup();

    await usecase.execute({ ...interaction, requestId: 'novu_human:ses_1:sevt_1' } as any);

    expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
    expect(confirmToolApproval.execute.called).to.equal(false);
  });

  it('treats expire as a managed denial that does not run the tool', async () => {
    const { usecase, conversationService, confirmToolApproval } = setup();

    await usecase.execute({
      ...interaction,
      status: HumanInteractionStatusEnum.EXPIRED,
      response: undefined,
    } as any);

    expect(conversationService.persistToolApprovalDecision.firstCall.args[0].approved).to.equal(false);
    expect(confirmToolApproval.execute.firstCall.args[0].parsed.approved).to.equal(false);
    expect(confirmToolApproval.execute.firstCall.args[0].parsed.trust).to.equal(undefined);
  });
});
