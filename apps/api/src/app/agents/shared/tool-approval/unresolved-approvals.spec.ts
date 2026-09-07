import {
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
} from '@novu/dal';
import { expect } from 'chai';
import {
  findOrphanedApprovedToolApprovalRequests,
  findUnresolvedToolApprovalRequests,
  resolveApprovalRequesterId,
} from './unresolved-approvals';

function activity(overrides: Partial<ConversationActivityEntity>): ConversationActivityEntity {
  return {
    _id: 'act-id',
    identifier: 'act-id',
    _conversationId: 'conv-1',
    type: ConversationActivityTypeEnum.MESSAGE,
    content: '',
    platform: 'sendblue',
    _integrationId: 'int-1',
    platformThreadId: 'thread-1',
    senderType: ConversationActivitySenderTypeEnum.AGENT,
    senderId: 'agent-1',
    _environmentId: 'env-1' as any,
    _organizationId: 'org-1' as any,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('resolveApprovalRequesterId', () => {
  const request = activity({
    type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
    senderType: ConversationActivitySenderTypeEnum.AGENT,
    senderId: 'support-agent',
    toolData: { approvalId: 'approval-1', toolCallId: 'tc-1', toolName: 'issueRefund' },
  });

  it('returns the nearest preceding human sender (newest-first history)', () => {
    // getHistory returns newest-first: the request is newer than the human
    // message that triggered it.
    const history = [
      request,
      activity({
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        senderId: 'sub-requester',
      }),
    ];

    expect(resolveApprovalRequesterId(history, request)).to.equal('sub-requester');
  });

  it('skips agent messages and finds the nearest human sender further back', () => {
    const history = [
      request,
      activity({ type: ConversationActivityTypeEnum.MESSAGE, senderType: ConversationActivitySenderTypeEnum.AGENT }),
      activity({
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.PLATFORM_USER,
        senderId: 'sendblue:+15557654321',
      }),
    ];

    expect(resolveApprovalRequesterId(history, request)).to.equal('sendblue:+15557654321');
  });

  it('returns null when no human message precedes the request', () => {
    const history = [request];

    expect(resolveApprovalRequesterId(history, request)).to.equal(null);
  });

  it('returns null when the request cannot be located in the supplied history', () => {
    const history = [
      activity({
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        senderId: 'sub-requester',
      }),
    ];

    expect(resolveApprovalRequesterId(history, request)).to.equal(null);
  });

  it('does not cross into a different approval request when scanning backwards', () => {
    // Two approvals outstanding; each should only see its own preceding human message.
    const otherRequest = activity({
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
      toolData: { approvalId: 'approval-2', toolCallId: 'tc-2', toolName: 'sendEmail' },
    });
    const history = [
      request,
      activity({
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        senderId: 'sub-requester-1',
      }),
      otherRequest,
      activity({
        type: ConversationActivityTypeEnum.MESSAGE,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        senderId: 'sub-requester-2',
      }),
    ];

    expect(resolveApprovalRequesterId(history, request)).to.equal('sub-requester-1');
    expect(resolveApprovalRequesterId(history, otherRequest)).to.equal('sub-requester-2');
  });
});

describe('findUnresolvedToolApprovalRequests', () => {
  it('excludes requests that already have a decision', () => {
    const request = activity({
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
      toolData: { approvalId: 'approval-1', toolCallId: 'tc-1', toolName: 'issueRefund' },
    });
    const decision = activity({
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
      toolData: { approvalId: 'approval-1', approved: true },
    });

    expect(findUnresolvedToolApprovalRequests([decision, request])).to.deep.equal([]);
  });
});

describe('findOrphanedApprovedToolApprovalRequests', () => {
  const request = activity({
    type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
    toolData: { approvalId: 'approval-1', toolCallId: 'tc-1', toolName: 'launchConfetti' },
  });
  const approvedDecision = activity({
    type: ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
    toolData: { approvalId: 'approval-1', approved: true },
  });

  it('returns requests approved without a tool result', () => {
    expect(findOrphanedApprovedToolApprovalRequests([approvedDecision, request])).to.deep.equal([request]);
  });

  it('excludes requests whose tool produced a result', () => {
    const result = activity({
      type: ConversationActivityTypeEnum.TOOL_RESULT,
      toolData: { toolCallId: 'tc-1', toolName: 'launchConfetti', output: { ok: true } },
    });

    expect(findOrphanedApprovedToolApprovalRequests([result, approvedDecision, request])).to.deep.equal([]);
  });

  it('excludes requests that already carry a denial', () => {
    const denial = activity({
      type: ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
      toolData: { approvalId: 'approval-1', approved: false },
    });

    expect(findOrphanedApprovedToolApprovalRequests([denial, approvedDecision, request])).to.deep.equal([]);
  });

  it('excludes undecided requests (those belong to the pending finder)', () => {
    expect(findOrphanedApprovedToolApprovalRequests([request])).to.deep.equal([]);
  });
});
