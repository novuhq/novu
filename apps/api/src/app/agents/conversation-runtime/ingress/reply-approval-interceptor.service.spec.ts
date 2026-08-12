import { ConversationActivityTypeEnum } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { ReplyApprovalInterceptor } from './reply-approval-interceptor.service';

describe('ReplyApprovalInterceptor', () => {
  const pendingRequest = {
    type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
    platformMessageId: 'msg-approval',
    toolData: { approvalId: 'approval-1', toolCallId: 'tc-1', toolName: 'issueRefund' },
  };

  // Newest-first history: the human message that triggered the approval must
  // precede it so `resolveApprovalRequesterId` can authorize the verdict.
  const requesterMessage = {
    type: ConversationActivityTypeEnum.MESSAGE,
    senderType: 'subscriber',
    senderId: 'sub-1',
    content: 'Please issue the refund',
  };

  function makeDeps(history: unknown[] = [pendingRequest, requesterMessage]) {
    const channel = { platform: 'sendblue', platformThreadId: 'sendblue:+15551234567' };
    const conversationService = {
      getPrimaryChannel: sinon.stub().returns(channel),
      persistToolApprovalDecision: sinon.stub().resolves(undefined),
    };
    const activityLedger = {
      listForView: sinon.stub().resolves({ data: history, hasMore: false }),
    };
    const outboundGateway = {
      replyOnThread: sinon.stub().resolves({ messageId: 'ack-1', platformThreadId: channel.platformThreadId }),
    };
    const logger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      setContext: sinon.stub(),
    };
    const interceptor = new ReplyApprovalInterceptor(
      conversationService as any,
      activityLedger as any,
      outboundGateway as any,
      logger as any
    );

    return { interceptor, conversationService, activityLedger, outboundGateway };
  }

  function makeTurn(overrides: Record<string, unknown> = {}) {
    return {
      agentId: 'agent-1',
      agent: { _id: 'agent-1' },
      config: {
        environmentId: 'env-1',
        organizationId: 'org-1',
        platform: 'sendblue',
        agentIdentifier: 'support-agent',
        integrationIdentifier: 'sendblue-main',
      },
      conversation: { _id: 'conv-1' },
      subscriber: { subscriberId: 'sub-1' },
      message: { id: 'msg-yes', text: 'yes', author: { userId: '+15557654321' } },
      event: AgentEventEnum.ON_MESSAGE,
      thread: { id: 'sendblue:+15557654321' },
      platformThreadId: 'sendblue:+15557654321',
      ...overrides,
    } as any;
  }

  it('should consume an approving reply: persist the decision, ack, and dispatch a self-hosted ON_ACTION', async () => {
    const { interceptor, conversationService, outboundGateway } = makeDeps();
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn();

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(true);
    expect(conversationService.persistToolApprovalDecision.calledOnce).to.equal(true);
    expect(conversationService.persistToolApprovalDecision.firstCall.args[0]).to.include({
      approvalId: 'approval-1',
      approved: true,
      toolName: 'issueRefund',
      actorId: 'sub-1',
    });
    expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
    expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.include('Approved');
    expect(runtime.dispatch.calledOnce).to.equal(true);
    const dispatched = runtime.dispatch.firstCall.args[0];
    expect(dispatched.event).to.equal(AgentEventEnum.ON_ACTION);
    expect(dispatched.action).to.deep.equal({ id: 'tool-approval:approve:approval-1' });
    expect(dispatched.message).to.equal(null);
  });

  it('should consume an iMessage "Liked" tapback (delivered as text) as an approval', async () => {
    const { interceptor, conversationService } = makeDeps();
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({
      message: { id: 'msg-tap', text: 'Liked "Tool approval required: issueRefund"', author: { userId: '+1' } },
    });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(true);
    expect(conversationService.persistToolApprovalDecision.firstCall.args[0]).to.include({
      approvalId: 'approval-1',
      approved: true,
    });
    expect(runtime.dispatch.firstCall.args[0].action).to.deep.equal({ id: 'tool-approval:approve:approval-1' });
  });

  it('should consume an iMessage "Disliked" tapback as a denial', async () => {
    const { interceptor, conversationService } = makeDeps();
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({
      message: { id: 'msg-tap', text: 'Disliked "Tool approval required: issueRefund"', author: { userId: '+1' } },
    });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(true);
    expect(conversationService.persistToolApprovalDecision.firstCall.args[0]).to.include({ approved: false });
    expect(runtime.dispatch.firstCall.args[0].action).to.deep.equal({ id: 'tool-approval:deny:approval-1' });
  });

  it('should consume a "Reacted 👍 to" emoji tapback as an approval', async () => {
    const { interceptor } = makeDeps();
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({
      message: { id: 'msg-tap', text: 'Reacted 👍 to "Tool approval required: issueRefund"', author: { userId: '+1' } },
    });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(true);
    expect(runtime.dispatch.firstCall.args[0].action).to.deep.equal({ id: 'tool-approval:approve:approval-1' });
  });

  it('should fall through for a non-verdict tapback (Loved / Laughed)', async () => {
    const { interceptor, conversationService } = makeDeps();
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({
      message: { id: 'msg-tap', text: 'Loved "Tool approval required: issueRefund"', author: { userId: '+1' } },
    });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(false);
    expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
    expect(runtime.dispatch.called).to.equal(false);
  });

  it('should apply a tapback verdict to the specific pending approval it quotes, not just the oldest', async () => {
    // getHistory returns newest-first: approval-2 (sendEmail) is newer than
    // approval-1 (issueRefund), so a naive "answer the oldest" strategy would
    // wrongly resolve this tapback to approval-1.
    const { interceptor, conversationService } = makeDeps([
      {
        type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
        platformMessageId: 'msg-approval-2',
        toolData: { approvalId: 'approval-2', toolCallId: 'tc-2', toolName: 'sendEmail' },
      },
      requesterMessage,
      pendingRequest,
      requesterMessage,
    ]);
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({
      message: { id: 'msg-tap', text: 'Liked "Tool approval required: sendEmail"', author: { userId: '+1' } },
    });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(true);
    expect(conversationService.persistToolApprovalDecision.firstCall.args[0]).to.include({
      approvalId: 'approval-2',
      approved: true,
    });
    expect(runtime.dispatch.firstCall.args[0].action).to.deep.equal({ id: 'tool-approval:approve:approval-2' });
  });

  it('should not apply a tapback verdict to any pending approval when the quoted text does not match one', async () => {
    // Two approvals are outstanding, but the tapback quotes text unrelated to
    // either one (e.g. it targets some other message in the thread) — this
    // must never be resolved to "the oldest approval" by default.
    const { interceptor, conversationService } = makeDeps([
      {
        type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
        platformMessageId: 'msg-approval-2',
        toolData: { approvalId: 'approval-2', toolCallId: 'tc-2', toolName: 'sendEmail' },
      },
      pendingRequest,
    ]);
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({
      message: { id: 'msg-tap', text: 'Liked "Thanks for reaching out!"', author: { userId: '+1' } },
    });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(false);
    expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
    expect(runtime.dispatch.called).to.equal(false);
  });

  it('should not approve a pending tool when the tapback quote only contains the tool name as a substring', async () => {
    // Regression: liking an unrelated message must never green-light a pending
    // approval just because a word in the quote happens to contain the tool
    // name as a substring (e.g. "thread" contains "read").
    const { interceptor, conversationService } = makeDeps([
      {
        type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
        platformMessageId: 'msg-approval-read',
        toolData: { approvalId: 'approval-read', toolCallId: 'tc-read', toolName: 'read' },
      },
    ]);
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({
      message: { id: 'msg-tap', text: 'Liked "New thread created."', author: { userId: '+1' } },
    });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(false);
    expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
    expect(runtime.dispatch.called).to.equal(false);
  });

  it('should still match a short tool name when it appears as a whole token in the tapback quote', async () => {
    const { interceptor, conversationService } = makeDeps([
      {
        type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
        platformMessageId: 'msg-approval-read',
        toolData: { approvalId: 'approval-read', toolCallId: 'tc-read', toolName: 'read' },
      },
      requesterMessage,
    ]);
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({
      message: { id: 'msg-tap', text: 'Liked "Tool approval required: read"', author: { userId: '+1' } },
    });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(true);
    expect(conversationService.persistToolApprovalDecision.firstCall.args[0]).to.include({
      approvalId: 'approval-read',
      approved: true,
    });
  });

  it('should fall through when a tapback is removed', async () => {
    const { interceptor } = makeDeps();
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({
      message: {
        id: 'msg-tap',
        text: 'Removed a like from "Tool approval required: issueRefund"',
        author: { userId: '+1' },
      },
    });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(false);
    expect(runtime.dispatch.called).to.equal(false);
  });

  it('should consume a denying reply and dispatch a deny action', async () => {
    const { interceptor, conversationService } = makeDeps();
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({ message: { id: 'msg-no', text: 'No.', author: { userId: '+15557654321' } } });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(true);
    expect(conversationService.persistToolApprovalDecision.firstCall.args[0]).to.include({
      approvalId: 'approval-1',
      approved: false,
    });
    expect(runtime.dispatch.firstCall.args[0].action).to.deep.equal({ id: 'tool-approval:deny:approval-1' });
  });

  it('should use the managed action-id grammar for managed agents', async () => {
    const { interceptor } = makeDeps();
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({
      agent: { _id: 'agent-1', runtime: 'managed', managedRuntime: { providerId: 'anthropic' } },
    });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(true);
    expect(runtime.dispatch.firstCall.args[0].action).to.deep.equal({ id: 'direct-approval:approve:approval-1' });
  });

  it('should fall through when the platform has interactive buttons', async () => {
    const { interceptor, activityLedger } = makeDeps();
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({ config: { ...makeTurn().config, platform: 'slack' } });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(false);
    expect(activityLedger.listForView.called).to.equal(false);
    expect(runtime.dispatch.called).to.equal(false);
  });

  it('should fall through when the reply is not an unambiguous verdict', async () => {
    const { interceptor, conversationService } = makeDeps();
    const runtime = { dispatch: sinon.stub().resolves(undefined) };
    const turn = makeTurn({
      message: { id: 'msg-1', text: 'yes, but change the amount', author: { userId: '+15557654321' } },
    });

    const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

    expect(consumed).to.equal(false);
    expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
    expect(runtime.dispatch.called).to.equal(false);
  });

  it('should fall through when no approval is pending', async () => {
    const { interceptor } = makeDeps([]);
    const runtime = { dispatch: sinon.stub().resolves(undefined) };

    const consumed = await interceptor.tryHandleAsApprovalReply(makeTurn(), runtime as any);

    expect(consumed).to.equal(false);
    expect(runtime.dispatch.called).to.equal(false);
  });

  it('should fall through when the pending approval was already decided', async () => {
    const { interceptor } = makeDeps([
      {
        type: ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
        toolData: { approvalId: 'approval-1', approved: true },
      },
      pendingRequest,
    ]);
    const runtime = { dispatch: sinon.stub().resolves(undefined) };

    const consumed = await interceptor.tryHandleAsApprovalReply(makeTurn(), runtime as any);

    expect(consumed).to.equal(false);
    expect(runtime.dispatch.called).to.equal(false);
  });

  it('should answer the oldest pending approval when several are outstanding', async () => {
    // getHistory returns newest-first; the oldest request is last.
    const { interceptor } = makeDeps([
      {
        type: ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
        toolData: { approvalId: 'approval-2', toolCallId: 'tc-2', toolName: 'sendEmail' },
      },
      requesterMessage,
      pendingRequest,
      requesterMessage,
    ]);
    const runtime = { dispatch: sinon.stub().resolves(undefined) };

    const consumed = await interceptor.tryHandleAsApprovalReply(makeTurn(), runtime as any);

    expect(consumed).to.equal(true);
    expect(runtime.dispatch.firstCall.args[0].action).to.deep.equal({ id: 'tool-approval:approve:approval-1' });
  });

  it('should still dispatch the verdict when persisting the decision fails', async () => {
    const { interceptor, conversationService } = makeDeps();
    conversationService.persistToolApprovalDecision.rejects(new Error('mongo down'));
    const runtime = { dispatch: sinon.stub().resolves(undefined) };

    const consumed = await interceptor.tryHandleAsApprovalReply(makeTurn(), runtime as any);

    expect(consumed).to.equal(true);
    expect(runtime.dispatch.calledOnce).to.equal(true);
  });

  describe('approver identity verification (group threads)', () => {
    // A group iMessage/SMS thread has more than one human participant sharing
    // the same conversation. `sub-requester` is the participant whose message
    // caused the agent to propose the tool call; `sub-other` is a different
    // participant in the same thread who must not be able to approve/deny it.
    function makeGroupHistory() {
      return [
        pendingRequest,
        {
          type: ConversationActivityTypeEnum.MESSAGE,
          senderType: 'subscriber',
          senderId: 'sub-requester',
          content: 'Please issue the refund',
        },
      ];
    }

    it('should not consume a YES/NO reply from a different participant than the one who triggered the approval', async () => {
      const { interceptor, conversationService } = makeDeps(makeGroupHistory());
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeTurn({ subscriber: { subscriberId: 'sub-other' } });

      const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

      expect(consumed).to.equal(false);
      expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
      expect(runtime.dispatch.called).to.equal(false);
    });

    it('should consume a YES/NO reply from the same participant who triggered the approval', async () => {
      const { interceptor, conversationService } = makeDeps(makeGroupHistory());
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeTurn({ subscriber: { subscriberId: 'sub-requester' } });

      const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

      expect(consumed).to.equal(true);
      expect(conversationService.persistToolApprovalDecision.calledOnce).to.equal(true);
      expect(runtime.dispatch.calledOnce).to.equal(true);
    });

    it('should not consume a tapback from a different participant than the one who triggered the approval', async () => {
      const { interceptor, conversationService } = makeDeps(makeGroupHistory());
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeTurn({
        subscriber: { subscriberId: 'sub-other' },
        message: { id: 'msg-tap', text: 'Liked "Tool approval required: issueRefund"', author: { userId: '+1' } },
      });

      const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

      expect(consumed).to.equal(false);
      expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
      expect(runtime.dispatch.called).to.equal(false);
    });

    it('should not consume a reaction verdict from a different participant than the one who triggered the approval', async () => {
      const { interceptor, conversationService } = makeDeps(makeGroupHistory());
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeTurn({
        subscriber: { subscriberId: 'sub-other' },
        message: null,
        event: AgentEventEnum.ON_REACTION,
        reaction: { emoji: 'thumbs_up', added: true, messageId: 'msg-approval' },
      });

      const consumed = await interceptor.tryHandleAsApprovalReaction(turn, runtime as any);

      expect(consumed).to.equal(false);
      expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
      expect(runtime.dispatch.called).to.equal(false);
    });

    it('should not consume a verdict when the actor identity cannot be resolved at all', async () => {
      const { interceptor, conversationService } = makeDeps(makeGroupHistory());
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeTurn({ subscriber: null, message: { id: 'msg-yes', text: 'yes', author: { userId: '' } } });

      const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

      expect(consumed).to.equal(false);
      expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
      expect(runtime.dispatch.called).to.equal(false);
    });

    it('should not consume a YES/NO reply when no preceding human requester can be resolved from history', async () => {
      // Regression: unresolved expected approver must fail closed — otherwise
      // any group-thread participant can approve a programmatically triggered
      // (or history-truncated) pending tool action.
      const { interceptor, conversationService } = makeDeps([pendingRequest]);
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeTurn({ subscriber: { subscriberId: 'sub-other' } });

      const consumed = await interceptor.tryHandleAsApprovalReply(turn, runtime as any);

      expect(consumed).to.equal(false);
      expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
      expect(runtime.dispatch.called).to.equal(false);
    });

    it('should not consume a reaction verdict when no preceding human requester can be resolved from history', async () => {
      const { interceptor, conversationService } = makeDeps([pendingRequest]);
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeTurn({
        subscriber: { subscriberId: 'sub-other' },
        message: null,
        event: AgentEventEnum.ON_REACTION,
        reaction: { emoji: 'thumbs_up', added: true, messageId: 'msg-approval' },
      });

      const consumed = await interceptor.tryHandleAsApprovalReaction(turn, runtime as any);

      expect(consumed).to.equal(false);
      expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
      expect(runtime.dispatch.called).to.equal(false);
    });
  });

  describe('tryHandleAsApprovalReaction', () => {
    function makeReactionTurn(overrides: Record<string, unknown> = {}) {
      return makeTurn({
        message: null,
        event: AgentEventEnum.ON_REACTION,
        reaction: { emoji: 'thumbs_up', added: true, messageId: 'msg-approval' },
        ...overrides,
      });
    }

    it('should consume a 👍 on the approval card: persist, ack, and dispatch an approve ON_ACTION', async () => {
      const { interceptor, conversationService, outboundGateway } = makeDeps();
      const runtime = { dispatch: sinon.stub().resolves(undefined) };

      const consumed = await interceptor.tryHandleAsApprovalReaction(makeReactionTurn(), runtime as any);

      expect(consumed).to.equal(true);
      expect(conversationService.persistToolApprovalDecision.firstCall.args[0]).to.include({
        approvalId: 'approval-1',
        approved: true,
        toolName: 'issueRefund',
        actorId: 'sub-1',
      });
      expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
      const dispatched = runtime.dispatch.firstCall.args[0];
      expect(dispatched.event).to.equal(AgentEventEnum.ON_ACTION);
      expect(dispatched.action).to.deep.equal({ id: 'tool-approval:approve:approval-1' });
      expect(dispatched.reaction).to.equal(undefined);
      expect(dispatched.message).to.equal(null);
    });

    it('should consume a 👎 on the approval card as a deny verdict', async () => {
      const { interceptor, conversationService } = makeDeps();
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeReactionTurn({ reaction: { emoji: 'thumbs_down', added: true, messageId: 'msg-approval' } });

      const consumed = await interceptor.tryHandleAsApprovalReaction(turn, runtime as any);

      expect(consumed).to.equal(true);
      expect(conversationService.persistToolApprovalDecision.firstCall.args[0]).to.include({
        approvalId: 'approval-1',
        approved: false,
      });
      expect(runtime.dispatch.firstCall.args[0].action).to.deep.equal({ id: 'tool-approval:deny:approval-1' });
    });

    it('should use the managed action-id grammar for managed agents', async () => {
      const { interceptor } = makeDeps();
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeReactionTurn({
        agent: { _id: 'agent-1', runtime: 'managed', managedRuntime: { providerId: 'anthropic' } },
      });

      const consumed = await interceptor.tryHandleAsApprovalReaction(turn, runtime as any);

      expect(consumed).to.equal(true);
      expect(runtime.dispatch.firstCall.args[0].action).to.deep.equal({ id: 'direct-approval:approve:approval-1' });
    });

    it('should fall through when the reacted message is not the approval card', async () => {
      const { interceptor, conversationService } = makeDeps();
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeReactionTurn({ reaction: { emoji: 'thumbs_up', added: true, messageId: 'some-other-msg' } });

      const consumed = await interceptor.tryHandleAsApprovalReaction(turn, runtime as any);

      expect(consumed).to.equal(false);
      expect(conversationService.persistToolApprovalDecision.called).to.equal(false);
      expect(runtime.dispatch.called).to.equal(false);
    });

    it('should fall through when the reaction was removed rather than added', async () => {
      const { interceptor, activityLedger } = makeDeps();
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeReactionTurn({ reaction: { emoji: 'thumbs_up', added: false, messageId: 'msg-approval' } });

      const consumed = await interceptor.tryHandleAsApprovalReaction(turn, runtime as any);

      expect(consumed).to.equal(false);
      expect(activityLedger.listForView.called).to.equal(false);
      expect(runtime.dispatch.called).to.equal(false);
    });

    it('should fall through for an emoji that is not a verdict', async () => {
      const { interceptor, activityLedger } = makeDeps();
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeReactionTurn({ reaction: { emoji: 'heart', added: true, messageId: 'msg-approval' } });

      const consumed = await interceptor.tryHandleAsApprovalReaction(turn, runtime as any);

      expect(consumed).to.equal(false);
      expect(activityLedger.listForView.called).to.equal(false);
      expect(runtime.dispatch.called).to.equal(false);
    });

    it('should fall through when the platform has interactive buttons', async () => {
      const { interceptor, activityLedger } = makeDeps();
      const runtime = { dispatch: sinon.stub().resolves(undefined) };
      const turn = makeReactionTurn({ config: { ...makeTurn().config, platform: 'slack' } });

      const consumed = await interceptor.tryHandleAsApprovalReaction(turn, runtime as any);

      expect(consumed).to.equal(false);
      expect(activityLedger.listForView.called).to.equal(false);
      expect(runtime.dispatch.called).to.equal(false);
    });

    it('should fall through when the matching approval was already decided', async () => {
      const { interceptor } = makeDeps([
        {
          type: ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
          toolData: { approvalId: 'approval-1', approved: true },
        },
        pendingRequest,
      ]);
      const runtime = { dispatch: sinon.stub().resolves(undefined) };

      const consumed = await interceptor.tryHandleAsApprovalReaction(makeReactionTurn(), runtime as any);

      expect(consumed).to.equal(false);
      expect(runtime.dispatch.called).to.equal(false);
    });
  });
});
