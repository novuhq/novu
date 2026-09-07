import { ConversationActivityTypeEnum } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { BridgeExpireSupersededApprovalsService } from './bridge-expire-superseded-approvals.service';

describe('BridgeExpireSupersededApprovalsService', () => {
  function makeLogger() {
    return {
      warn: sinon.stub(),
      setContext: sinon.stub(),
    };
  }

  function makeTurn(overrides: Record<string, unknown> = {}) {
    return {
      agentId: 'agent-id',
      config: {
        environmentId: 'env-id',
        organizationId: 'org-id',
        agentIdentifier: 'billing-agent',
        agentName: 'Billing Agent',
        integrationIdentifier: 'slack-int',
      },
      conversation: { _id: 'conv-id' },
      ...overrides,
    };
  }

  it('should persist a system denial and delete the pending approval card', async () => {
    const pendingRequest = {
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
      platformMessageId: 'msg-approval',
      toolData: { approvalId: 'approval-1', toolCallId: 'tc-1', toolName: 'issueRefund' },
    };
    const channel = { platform: 'slack', platformThreadId: 'thread-1' };
    const conversationService = {
      getPrimaryChannel: sinon.stub().returns(channel),
      persistToolApprovalDecision: sinon.stub().resolves(undefined),
      listForView: sinon.stub().resolves({ data: [pendingRequest], hasMore: false }),
    };
    const outboundGateway = {
      deleteInConversation: sinon.stub().resolves(undefined),
      edit: sinon.stub(),
    };
    const service = new BridgeExpireSupersededApprovalsService(
      conversationService as any,
      outboundGateway as any,
      makeLogger() as any
    );

    await service.expireOnNewMessage(makeTurn() as any);

    expect(conversationService.persistToolApprovalDecision.calledOnce).to.equal(true);
    expect(conversationService.persistToolApprovalDecision.firstCall.args[0]).to.include({
      approvalId: 'approval-1',
      approved: false,
    });
    expect(
      outboundGateway.deleteInConversation.calledOnceWithExactly(
        'agent-id',
        'slack-int',
        'thread-1',
        'msg-approval',
        undefined,
        {
          conversationId: 'conv-id',
          channel,
          agentIdentifier: 'billing-agent',
          agentName: 'Billing Agent',
          environmentId: 'env-id',
          organizationId: 'org-id',
        }
      )
    ).to.equal(true);
    expect(outboundGateway.edit.called).to.equal(false);
  });

  it('should deny an orphaned approved request without touching the channel', async () => {
    // Approved but the resume never produced a tool result — the card was already
    // handled by the approve flow, so only the terminal ledger row is missing.
    const request = {
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
      platformMessageId: 'msg-approval',
      toolData: { approvalId: 'approval-1', toolCallId: 'tc-1', toolName: 'launchConfetti' },
    };
    const approvedDecision = {
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
      toolData: { approvalId: 'approval-1', approved: true },
    };
    const conversationService = {
      getPrimaryChannel: sinon.stub().returns({ platform: 'slack', platformThreadId: 'thread-1' }),
      persistToolApprovalDecision: sinon.stub().resolves(undefined),
      listForView: sinon.stub().resolves({ data: [approvedDecision, request], hasMore: false }),
    };
    const outboundGateway = {
      deleteInConversation: sinon.stub().resolves(undefined),
    };
    const service = new BridgeExpireSupersededApprovalsService(
      conversationService as any,
      outboundGateway as any,
      makeLogger() as any
    );

    await service.expireOnNewMessage(makeTurn() as any);

    expect(conversationService.persistToolApprovalDecision.calledOnce).to.equal(true);
    expect(conversationService.persistToolApprovalDecision.firstCall.args[0]).to.include({
      approvalId: 'approval-1',
      approved: false,
    });
    expect(outboundGateway.deleteInConversation.called).to.equal(false);
  });

  it('should skip channel cleanup when the approval request has no platform message id', async () => {
    const pendingRequest = {
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
      toolData: { approvalId: 'approval-1', toolCallId: 'tc-1', toolName: 'issueRefund' },
    };
    const conversationService = {
      getPrimaryChannel: sinon.stub().returns({ platform: 'slack', platformThreadId: 'thread-1' }),
      persistToolApprovalDecision: sinon.stub().resolves(undefined),
      listForView: sinon.stub().resolves({ data: [pendingRequest], hasMore: false }),
    };
    const outboundGateway = {
      deleteInConversation: sinon.stub().resolves(undefined),
    };
    const service = new BridgeExpireSupersededApprovalsService(
      conversationService as any,
      outboundGateway as any,
      makeLogger() as any
    );

    await service.expireOnNewMessage(makeTurn() as any);

    expect(outboundGateway.deleteInConversation.called).to.equal(false);
  });
});
