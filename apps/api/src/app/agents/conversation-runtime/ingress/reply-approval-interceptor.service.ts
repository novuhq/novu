import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationActivityEntity, ConversationActivitySenderTypeEnum } from '@novu/dal';
import { buildApprovalActionId } from '@novu/framework/internal';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { usesReplyBasedApprovals } from '../../shared/enums/agent-platform.enum';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import {
  buildToolApprovalActionId,
  buildToolTrustApprovalActionId,
  DIRECT_TOOL_APPROVAL_ACTION_PREFIX,
  MCP_TOOL_APPROVAL_ACTION_PREFIX,
} from '../../shared/tool-approval/action-id';
import {
  parseApprovalReactionVerdict,
  parseApprovalReplyVerdict,
  parseImessageTapback,
} from '../../shared/tool-approval/reply-based-approval';
import {
  findUnresolvedToolApprovalRequests,
  resolveApprovalRequesterId,
} from '../../shared/tool-approval/unresolved-approvals';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import { OutboundGateway } from '../egress/outbound.gateway';
import type { AgentRuntime } from '../runtime/agent-runtime.port';
import type { ConversationTurn } from '../runtime/conversation-turn';
import { applyPlatformThreadIdToThread } from '../runtime/platform-thread.util';

/** A resolved pending-approval activity plus the ledger it was found in, so callers can trace back who requested it. */
interface PendingApprovalWithHistory {
  activities: ConversationActivityEntity[];
  request: ConversationActivityEntity;
}

function buildAckText(approved: boolean, willAlwaysAllow: boolean, toolName: string | undefined): string {
  if (approved && willAlwaysAllow) {
    return toolName
      ? `Approved — I won't ask again before running ${toolName}.`
      : "Approved — I won't ask again before running this tool.";
  }

  if (approved) {
    return toolName ? `Approved — running ${toolName} now.` : 'Approved — on it.';
  }

  return toolName ? `Okay, ignored — I won't run ${toolName}.` : 'Okay, ignored.';
}

/**
 * True when `toolName` appears in `normalizedQuote` as a whole token, not as a
 * substring of a longer word (e.g. `read` must not match inside `thread`).
 */
function quoteContainsToolName(normalizedQuote: string, toolName: string): boolean {
  const escaped = toolName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`\\b${escaped}\\b`, 'i').test(normalizedQuote);
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

    // A whole-message "yes"/"no"/"always" reply has no target of its own —
    // replies are always answers to whichever approval is oldest, since
    // approvals are prompted sequentially on these platforms.
    const replyVerdict = parseApprovalReplyVerdict(text);
    if (replyVerdict !== null) {
      const found = await this.findOldestPendingApproval(turn);

      return this.consumePendingApproval(turn, runtime, found, {
        approved: replyVerdict !== 'deny',
        alwaysAllow: replyVerdict === 'always_allow',
      });
    }

    // An iMessage tapback (👍/👎) delivered as text by Sendblue (`Liked "…"` /
    // `Disliked "…"`) DOES carry its own target — the quoted text it echoes
    // back — so it must be matched against a specific pending approval rather
    // than assumed to be the oldest one. An unrecognized or unmatched tapback
    // falls through as a normal message; it must never green-light a tool
    // just because *some* approval happens to be outstanding.
    const tapback = parseImessageTapback(text);
    if (!tapback) {
      return false;
    }

    const found = await this.findPendingApprovalForTapback(turn, tapback.quotedText);

    // Tapbacks are approve/deny only — there is no "always allow" tapback.
    return this.consumePendingApproval(turn, runtime, found, { approved: tapback.approved, alwaysAllow: false });
  }

  private async consumePendingApproval(
    turn: ConversationTurn,
    runtime: AgentRuntime,
    found: PendingApprovalWithHistory | null,
    decision: { approved: boolean; alwaysAllow: boolean }
  ): Promise<boolean> {
    if (!found) {
      return false;
    }

    const { activities, request: pending } = found;

    const approvalId = pending.toolData?.approvalId;
    if (typeof approvalId !== 'string') {
      return false;
    }

    if (!this.isFromExpectedApprover(turn, activities, pending)) {
      return false;
    }

    return this.consumeVerdict(turn, runtime, {
      approvalId,
      approved: decision.approved,
      alwaysAllow: decision.alwaysAllow,
      toolName: pending.toolData?.toolName,
      mcpServerName: pending.toolData?.mcpServerName,
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

    const found = await this.findPendingApprovalForMessage(turn, reaction.messageId);
    if (!found) {
      return false;
    }

    const { activities, request: pending } = found;

    const approvalId = pending.toolData?.approvalId;
    if (typeof approvalId !== 'string') {
      return false;
    }

    if (!this.isFromExpectedApprover(turn, activities, pending)) {
      return false;
    }

    // Reactions are approve/deny only — there is no "always allow" reaction.
    return this.consumeVerdict(turn, runtime, {
      approvalId,
      approved: verdict,
      alwaysAllow: false,
      toolName: pending.toolData?.toolName,
      mcpServerName: pending.toolData?.mcpServerName,
      source: 'reaction',
    });
  }

  /**
   * Verifies the participant issuing the verdict is the same one whose turn
   * caused the agent to propose this tool call — not just any participant of
   * the same thread. Matters on threads with more than one human participant
   * (e.g. group iMessage/SMS on Sendblue): without this, any other
   * participant could approve or deny someone else's pending tool action.
   *
   * Falls closed when the ledger has no record of who prompted the request
   * (e.g. programmatically triggered approvals, or truncated history) — an
   * unresolved expected approver must never authorize a verdict. Also falls
   * closed when the verdict's own actor identity can't be determined.
   */
  private isFromExpectedApprover(
    turn: ConversationTurn,
    activities: ConversationActivityEntity[],
    request: ConversationActivityEntity
  ): boolean {
    const expectedApproverId = resolveApprovalRequesterId(activities, request);
    const actorId = this.resolveCurrentActorId(turn);

    if (!expectedApproverId || !actorId || actorId !== expectedApproverId) {
      this.logWrongApprover(turn, request, expectedApproverId, actorId);

      return false;
    }

    return true;
  }

  private resolveCurrentActorId(turn: ConversationTurn): string | null {
    if (turn.subscriber?.subscriberId) {
      return turn.subscriber.subscriberId;
    }

    if (turn.message?.author.userId) {
      return `${turn.config.platform}:${turn.message.author.userId}`;
    }

    return null;
  }

  private logWrongApprover(
    turn: ConversationTurn,
    request: ConversationActivityEntity,
    expectedApproverId: string | null,
    actorId: string | null
  ): void {
    const { config, conversation } = turn;

    this.logger.warn(
      {
        conversationId: conversation._id,
        approvalId: request.toolData?.approvalId,
        expectedApproverId,
        actorId,
        platform: config.platform,
      },
      `[agent:${config.agentIdentifier}] Ignoring reply-based approval verdict from a participant other than the one the approval was addressed to`
    );
    captureAgentWarning(new Error('Reply-based approval verdict from an unexpected participant'), {
      component: 'reply-approval-interceptor',
      operation: 'verify-approver-identity',
      agentIdentifier: config.agentIdentifier,
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
    verdict: {
      approvalId: string;
      approved: boolean;
      alwaysAllow: boolean;
      toolName: string | undefined;
      mcpServerName: string | undefined;
      source: 'reply' | 'reaction';
    }
  ): Promise<boolean> {
    const { config, conversation } = turn;
    const { approvalId, approved, alwaysAllow, toolName, mcpServerName, source } = verdict;

    this.logger.info(
      { conversationId: conversation._id, approvalId, approved, alwaysAllow, platform: config.platform, source },
      `[agent:${config.agentIdentifier}] Consuming inbound ${source} as tool-approval verdict`
    );

    const isManagedAgent = turn.agent.runtime === 'managed' && Boolean(turn.agent.managedRuntime);
    // "Always allow" only actually persists trust for a managed agent with a
    // known tool name — otherwise it degrades to a one-off approve, so the ack
    // must not promise "won't ask again".
    const trustWillPersist = this.resolveTrustPersistence({
      alwaysAllow,
      approved,
      isManagedAgent,
      toolName,
      approvalId,
      turn,
    });

    await this.persistDecision(turn, approvalId, approved, toolName);
    await this.acknowledgeVerdict(turn, approved, trustWillPersist, toolName);

    const actionId = this.buildVerdictActionId({
      approvalId,
      approved,
      trustWillPersist,
      toolName,
      mcpServerName,
      isManagedAgent,
    });

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

  /**
   * Whether an "always allow" verdict will actually persist trust. Only true
   * for a managed agent with a known tool name — a self-hosted agent has no
   * trust grammar, and a missing tool name can't build a valid persist id.
   * Logs the degrade-to-one-off reason so the (otherwise silent) miss is
   * diagnosable. Always false for plain approve/deny.
   */
  private resolveTrustPersistence(params: {
    alwaysAllow: boolean;
    approved: boolean;
    isManagedAgent: boolean;
    toolName: string | undefined;
    approvalId: string;
    turn: ConversationTurn;
  }): boolean {
    const { alwaysAllow, approved, isManagedAgent, toolName, approvalId, turn } = params;

    if (!alwaysAllow || !approved) {
      return false;
    }

    const { config, conversation } = turn;

    if (!isManagedAgent) {
      this.logger.debug(
        { conversationId: conversation._id, approvalId, platform: config.platform },
        `[agent:${config.agentIdentifier}] Always-allow is not supported for self-hosted agents; approving once`
      );

      return false;
    }

    if (!toolName) {
      this.logger.debug(
        { conversationId: conversation._id, approvalId },
        `[agent:${config.agentIdentifier}] Always-allow requested but the pending approval has no tool name; approving once`
      );

      return false;
    }

    return true;
  }

  /**
   * Builds the ON_ACTION id the verdict is re-dispatched as. A plain approve/
   * deny re-uses the button-click grammar; an honored "always allow" instead
   * emits the managed `approve-tool` persist id (MCP-aware) so trust is stored
   * and the tool stops prompting. When trust can't persist, it falls back to a
   * one-off approve so the verdict is never silently dropped.
   */
  private buildVerdictActionId(params: {
    approvalId: string;
    approved: boolean;
    trustWillPersist: boolean;
    toolName: string | undefined;
    mcpServerName: string | undefined;
    isManagedAgent: boolean;
  }): string {
    const { approvalId, approved, trustWillPersist, toolName, mcpServerName, isManagedAgent } = params;

    // `trustWillPersist` already guarantees a managed agent and a tool name.
    if (trustWillPersist && toolName) {
      return mcpServerName
        ? buildToolTrustApprovalActionId({
            prefix: MCP_TOOL_APPROVAL_ACTION_PREFIX,
            verdict: 'approve-tool',
            toolUseId: approvalId,
            toolName,
            mcpServerName,
          })
        : buildToolTrustApprovalActionId({
            prefix: DIRECT_TOOL_APPROVAL_ACTION_PREFIX,
            verdict: 'approve-tool',
            toolUseId: approvalId,
            toolName,
          });
    }

    // Re-dispatch as the equivalent button click. Verdict-only ids parse
    // identically under both managed prefixes, and self-hosted uses the
    // framework grammar the bridge's onToolApproval handler expects.
    return isManagedAgent
      ? buildToolApprovalActionId(DIRECT_TOOL_APPROVAL_ACTION_PREFIX, approved ? 'approve' : 'deny', approvalId)
      : buildApprovalActionId(approved ? 'approve' : 'deny', approvalId);
  }

  private async findOldestPendingApproval(turn: ConversationTurn): Promise<PendingApprovalWithHistory | null> {
    const { activities, pending } = await this.loadConversationContext(turn);

    // Approvals are prompted sequentially, so a reply always answers the
    // oldest outstanding request.
    const request = pending[0];

    return request ? { activities, request } : null;
  }

  /**
   * Resolves the pending approval a tapback's quoted text actually targets.
   * A tapback carries no message id — only this echoed quote of the tapped
   * message — so it is matched against each pending request's tool name
   * (which is always present in the rendered approval prompt) instead of
   * defaulting to "whichever approval is oldest". The tool name must appear
   * as a whole token (word-boundary), never as a substring of an unrelated
   * word — otherwise liking "New thread created." would green-light a pending
   * `read` approval. An unrelated quote, or one that matches more than one
   * outstanding approval ambiguously, resolves to `null` so the tapback falls
   * through instead of guessing.
   */
  private async findPendingApprovalForTapback(
    turn: ConversationTurn,
    quotedText: string
  ): Promise<PendingApprovalWithHistory | null> {
    const normalizedQuote = quotedText.trim().toLowerCase();
    if (!normalizedQuote) {
      return null;
    }

    const { activities, pending } = await this.loadConversationContext(turn);
    const matches = pending.filter((request) => {
      const toolName = request.toolData?.toolName;

      return typeof toolName === 'string' && toolName.length > 0 && quoteContainsToolName(normalizedQuote, toolName);
    });

    return matches.length === 1 ? { activities, request: matches[0] } : null;
  }

  /**
   * Resolves the pending approval whose posted card matches `messageId` — the
   * message the user reacted to. Returns `null` when the reacted message is not
   * an outstanding approval card, so the reaction flows through unchanged.
   */
  private async findPendingApprovalForMessage(
    turn: ConversationTurn,
    messageId: string
  ): Promise<PendingApprovalWithHistory | null> {
    const { activities, pending } = await this.loadConversationContext(turn);
    const request = pending.find((entry) => entry.platformMessageId === messageId);

    return request ? { activities, request } : null;
  }

  private async loadConversationContext(
    turn: ConversationTurn
  ): Promise<{ activities: ConversationActivityEntity[]; pending: ConversationActivityEntity[] }> {
    const { config, conversation } = turn;

    try {
      const activities = await this.conversationService.getHistory(config.environmentId, conversation._id);

      return { activities, pending: findUnresolvedToolApprovalRequests(activities) };
    } catch (err) {
      this.logger.warn(err, `[agent:${config.agentIdentifier}] Failed to load history for reply-based approval check`);
      captureAgentWarning(err, {
        component: 'reply-approval-interceptor',
        operation: 'load-pending-approvals',
        agentIdentifier: config.agentIdentifier,
      });

      return { activities: [], pending: [] };
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
    willAlwaysAllow: boolean,
    toolName: string | undefined
  ): Promise<void> {
    const { config, conversation } = turn;
    const ack = buildAckText(approved, willAlwaysAllow, toolName);

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
