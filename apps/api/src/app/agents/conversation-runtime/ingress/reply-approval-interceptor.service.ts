import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationActivityEntity, ConversationActivitySenderTypeEnum } from '@novu/dal';
import { buildApprovalActionId } from '@novu/framework/internal';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { usesReplyBasedApprovals } from '../../shared/enums/agent-platform.enum';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import {
  buildToolApprovalActionId,
  DIRECT_TOOL_APPROVAL_ACTION_PREFIX,
} from '../../shared/tool-approval/action-id';
import {
  parseApprovalReactionVerdict,
  parseApprovalReplyVerdict,
  parseImessageTapbackVerdict,
} from '../../shared/tool-approval/reply-based-approval';
import { findUnresolvedToolApprovalRequests } from '../../shared/tool-approval/unresolved-approvals';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import { OutboundGateway } from '../egress/outbound.gateway';
import type { AgentRuntime } from '../runtime/agent-runtime.port';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { applyPlatformThreadIdToThread } from '../runtime/platform-thread.util';

function buildAckText(approved: boolean, toolName: string | undefined): string {
  if (approved) {
    return toolName ? `Approved — running ${toolName} now.` : 'Approved — on it.';
  }

  return toolName ? `Okay, ignored — I won't run ${toolName}.` : 'Okay, ignored.';
}

/**
 * Reply-based ("text back") tool approvals for platforms without callback
 * buttons (iMessage/SMS via Sendblue).
 *
 * When a tool approval is pending on such a conversation, the user's next
 * inbound message is checked for an unambiguous YES / NO verdict. A match is
 * consumed here: the decision is persisted to the ledger and the turn is
 * re-dispatched to the runtime as the equivalent ON_ACTION button click, so
 * the managed (`ConfirmToolApproval` → `sendToolResult`) and self-hosted
 * (bridge `onToolApproval`) resume paths work unchanged. Any other reply falls
 * through as a normal message — a hedged answer never green-lights a tool.
 */
@Injectable()
export class ReplyApprovalInterceptor {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly outboundGateway: OutboundGateway,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Returns `true` when the inbound message was consumed as an approval
   * verdict (the caller must not dispatch the original ON_MESSAGE turn).
   */
  async tryHandleAsApprovalReply(turn: ConversationTurn, runtime: AgentRuntime): Promise<boolean> {
    const { config } = turn;

    if (!usesReplyBasedApprovals(config.platform)) {
      return false;
    }

    const text = turn.message?.text;
    // A whole-message "yes"/"no", or an iMessage tapback (👍/👎) delivered as
    // text by Sendblue (`Liked "…"` / `Disliked "…"`). `??` preserves an
    // explicit `false` (deny) and only falls back to the tapback parser on
    // `null` (unrecognized reply).
    const verdict = parseApprovalReplyVerdict(text) ?? parseImessageTapbackVerdict(text);
    if (verdict === null) {
      return false;
    }

    const pending = await this.findOldestPendingApproval(turn);
    if (!pending) {
      return false;
    }

    const approvalId = pending.toolData?.approvalId;
    if (typeof approvalId !== 'string') {
      return false;
    }

    return this.consumeVerdict(turn, runtime, {
      approvalId,
      approved: verdict,
      toolName: pending.toolData?.toolName,
      source: 'reply',
    });
  }

  /**
   * Returns `true` when a reaction on the approval-request message was consumed
   * as an approval verdict (the caller must not forward the original
   * ON_REACTION turn to the runtime). A 👍 approves and a 👎 ignores; any other
   * emoji, a reaction removal, or a reaction on a message that isn't a pending
   * approval card falls through as a normal reaction.
   */
  async tryHandleAsApprovalReaction(turn: ConversationTurn, runtime: AgentRuntime): Promise<boolean> {
    const { config } = turn;

    if (!usesReplyBasedApprovals(config.platform)) {
      return false;
    }

    const reaction = turn.reaction;
    // Only a freshly-added reaction is a verdict — removing one must never
    // green-light or cancel a tool.
    if (!reaction?.added) {
      return false;
    }

    const verdict = parseApprovalReactionVerdict(reaction.emoji);
    if (verdict === null) {
      return false;
    }

    const pending = await this.findPendingApprovalForMessage(turn, reaction.messageId);
    if (!pending) {
      return false;
    }

    const approvalId = pending.toolData?.approvalId;
    if (typeof approvalId !== 'string') {
      return false;
    }

    return this.consumeVerdict(turn, runtime, {
      approvalId,
      approved: verdict,
      toolName: pending.toolData?.toolName,
      source: 'reaction',
    });
  }

  /**
   * Persists the verdict, acknowledges it, and re-dispatches the turn as the
   * equivalent approval-button click so the managed
   * (`ConfirmToolApproval` → `sendToolResult`) and self-hosted (bridge
   * `onToolApproval`) resume paths run unchanged. Shared by the reply- and
   * reaction-based entry points.
   */
  private async consumeVerdict(
    turn: ConversationTurn,
    runtime: AgentRuntime,
    verdict: { approvalId: string; approved: boolean; toolName: string | undefined; source: 'reply' | 'reaction' }
  ): Promise<boolean> {
    const { config, conversation } = turn;
    const { approvalId, approved, toolName, source } = verdict;

    this.logger.info(
      { conversationId: conversation._id, approvalId, approved, platform: config.platform, source },
      `[agent:${config.agentIdentifier}] Consuming inbound ${source} as tool-approval verdict`
    );

    await this.persistDecision(turn, approvalId, approved, toolName);
    await this.acknowledgeVerdict(turn, approved, toolName);

    // Re-dispatch as the equivalent button click. Verdict-only ids parse
    // identically under both managed prefixes, and self-hosted uses the
    // framework grammar the bridge's onToolApproval handler expects.
    const isManagedAgent = turn.agent.runtime === 'managed' && Boolean(turn.agent.managedRuntime);
    const actionId = isManagedAgent
      ? buildToolApprovalActionId(DIRECT_TOOL_APPROVAL_ACTION_PREFIX, approved ? 'approve' : 'deny', approvalId)
      : buildApprovalActionId(approved ? 'approve' : 'deny', approvalId);

    await runtime.dispatch({
      ...turn,
      event: AgentEventEnum.ON_ACTION,
      message: null,
      reaction: undefined,
      storedAttachments: undefined,
      // No sourceMessageId: an SMS approval prompt cannot be deleted, so the
      // card-cleanup path is skipped instead of failing per delivery.
      action: { id: actionId },
    });

    return true;
  }

  private async findOldestPendingApproval(turn: ConversationTurn): Promise<ConversationActivityEntity | null> {
    const pending = await this.loadUnresolvedApprovals(turn);

    // Approvals are prompted sequentially, so a reply always answers the
    // oldest outstanding request.
    return pending[0] ?? null;
  }

  /**
   * Resolves the pending approval whose posted card matches `messageId` — the
   * message the user reacted to. Returns `null` when the reacted message is not
   * an outstanding approval card, so the reaction flows through unchanged.
   */
  private async findPendingApprovalForMessage(
    turn: ConversationTurn,
    messageId: string
  ): Promise<ConversationActivityEntity | null> {
    const pending = await this.loadUnresolvedApprovals(turn);

    return pending.find((request) => request.platformMessageId === messageId) ?? null;
  }

  private async loadUnresolvedApprovals(turn: ConversationTurn): Promise<ConversationActivityEntity[]> {
    const { config, conversation } = turn;

    try {
      const activities = await this.conversationService.getHistory(config.environmentId, conversation._id);

      return findUnresolvedToolApprovalRequests(activities);
    } catch (err) {
      this.logger.warn(err, `[agent:${config.agentIdentifier}] Failed to load history for reply-based approval check`);
      captureAgentWarning(err, {
        component: 'reply-approval-interceptor',
        operation: 'load-pending-approvals',
        agentIdentifier: config.agentIdentifier,
      });

      return [];
    }
  }

  private async persistDecision(
    turn: ConversationTurn,
    approvalId: string,
    approved: boolean,
    toolName: string | undefined
  ): Promise<void> {
    const { config, conversation } = turn;
    const subscriberId = turn.subscriber?.subscriberId;
    const actorType = subscriberId
      ? ConversationActivitySenderTypeEnum.SUBSCRIBER
      : ConversationActivitySenderTypeEnum.PLATFORM_USER;
    const actorId = subscriberId ?? `${config.platform}:${turn.message?.author.userId ?? 'unknown'}`;

    try {
      await this.conversationService.persistToolApprovalDecision({
        conversationId: conversation._id,
        channel: this.conversationService.getPrimaryChannel(conversation),
        agentIdentifier: config.agentIdentifier,
        approvalId,
        approved,
        toolName,
        actorType,
        actorId,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
      });
    } catch (err) {
      // A failed transcript write must never drop the verdict — the runtime
      // still receives the ON_ACTION dispatch (mirrors the button-click path).
      this.logger.warn(err, `[agent:${config.agentIdentifier}] Failed to persist reply-based tool-approval decision`);
      captureAgentWarning(err, {
        component: 'reply-approval-interceptor',
        operation: 'persist-tool-approval-decision',
        agentIdentifier: config.agentIdentifier,
      });
    }
  }

  /**
   * Immediate confirmation text. Button platforms get visual feedback (the
   * card is deleted); on SMS nothing changes on screen and the tool may take a
   * while, so a short ack substitutes for that. Fail-soft — the verdict
   * dispatch must proceed even if the ack cannot be delivered.
   */
  private async acknowledgeVerdict(
    turn: ConversationTurn,
    approved: boolean,
    toolName: string | undefined
  ): Promise<void> {
    const { config, conversation } = turn;
    const ack = buildAckText(approved, toolName);

    try {
      applyPlatformThreadIdToThread(turn.thread, turn.platformThreadId);
      await this.outboundGateway.replyOnThread(
        turn.thread,
        { markdown: ack },
        {
          persist: {
            conversationId: conversation._id,
            channel: this.conversationService.getPrimaryChannel(conversation),
            agentIdentifier: config.agentIdentifier,
            content: ack,
            environmentId: config.environmentId,
            organizationId: config.organizationId,
          },
        }
      );
    } catch (err) {
      this.logger.warn(err, `[agent:${config.agentIdentifier}] Failed to deliver reply-based approval ack`);
      captureAgentWarning(err, {
        component: 'reply-approval-interceptor',
        operation: 'deliver-approval-ack',
        agentIdentifier: config.agentIdentifier,
      });
    }
  }
}
