import { Injectable } from '@nestjs/common';
import { AgentEntitlementsService, PinoLogger } from '@novu/application-generic';
import { ConversationEntity } from '@novu/dal';
import type { AgentAction } from '@novu/framework';
import type { CardElement, Thread } from 'chat';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { buildAttributedNovuUrl } from '../../shared/util/novu-attribution-url';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import { ConversationActivationService } from '../conversation/conversation-activation.service';
import { OutboundGateway } from '../egress/outbound.gateway';

const NOVU_AGENTS_UPGRADE_URL = 'https://go.novu.co/agents-upgrade';

// Link buttons render with a `link-` prefixed action id. They open a URL client-side;
// the SDK still emits an inbound action for the click, but there is nothing to do
// server-side, so it is swallowed. Runtime-agnostic.
export function isLinkButtonActionId(id: string | undefined): boolean {
  return typeof id === 'string' && id.startsWith('link-');
}

/** Which plan entitlement caused an over-limit agent/channel/conversation to be soft-blocked at runtime. */
export type PlanLimitBlockReason = 'agents' | 'channels' | 'conversations';

export const PLAN_LIMIT_BLOCK_MESSAGES: Record<PlanLimitBlockReason, string> = {
  agents:
    "This agent isn't active on your current Novu plan — you've reached the number of agents included in your plan. Please upgrade your plan to activate it.",
  channels:
    "This channel isn't active on your current Novu plan — you've reached the number of active channels included in your plan. Please upgrade your plan to activate it.",
  conversations:
    "You've reached the number of active conversations included in your current Novu plan. Upgrade your plan to start new conversations — your existing conversations keep working.",
};

function buildUpgradeRequiredCard(
  reason: PlanLimitBlockReason,
  agentIdentifier: string,
  platform: string
): CardElement {
  return {
    type: 'card',
    children: [
      {
        type: 'text',
        content: PLAN_LIMIT_BLOCK_MESSAGES[reason],
      },
      { type: 'divider' },
      {
        type: 'actions',
        children: [
          {
            type: 'link-button',
            label: 'Upgrade your plan',
            url: buildAttributedNovuUrl(
              NOVU_AGENTS_UPGRADE_URL,
              'agent-limits',
              agentIdentifier,
              platform,
              `${reason}-limit`
            ),
            style: 'primary',
          },
        ],
      },
    ],
  };
}

/**
 * Soft plan-limit enforcement for Connect inbound traffic. Agents/channels
 * created beyond the organization's plan limit keep existing but stop
 * functioning — inbound traffic gets an "upgrade your plan" reply instead of
 * being dispatched to the runtime.
 *
 * Single home for the gate so every inbound entry point (messages, actions)
 * enforces identical semantics:
 *   - Keyless/demo orgs are governed by their own caps (KeylessAbuseGuard) and
 *     are never gated here.
 *   - Limit evaluation fails open (`checkRuntimeLimits` is contractually
 *     non-throwing) so a transient error never disables a paying customer's agent.
 *   - The upgrade card's own CTA is a link-button; clicking it emits another
 *     inbound action. The gate never replies to link-button actions, so the
 *     card cannot spawn further cards.
 */
@Injectable()
export class PlanLimitGateService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly agentEntitlements: AgentEntitlementsService,
    private readonly outboundGateway: OutboundGateway,
    private readonly conversationActivation: ConversationActivationService,
    private readonly conversationService: AgentConversationService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Sync gate for web chat accept (`POST /web-chat/conversations`) before minting
   * `conv_*`. Returns block payload for HTTP 402; `null` when the turn may proceed.
   * Keyless orgs skip; entitlement errors fail open (same as runtime gate).
   */
  async checkWebChatAcceptLimits(
    agentId: string,
    config: ResolvedAgentConfig,
    isNewThread: boolean
  ): Promise<{ reason: PlanLimitBlockReason; message: string } | null> {
    if (config.isKeyless) {
      return null;
    }

    try {
      const block = await this.resolvePlanLimitBlock(agentId, config, {
        includeConversationLimit: isNewThread,
        isDirectMessage: true,
      });

      return block ? { reason: block, message: PLAN_LIMIT_BLOCK_MESSAGES[block] } : null;
    } catch (err) {
      this.logger.warn(err, `[agent:${agentId}] Web chat accept limit check failed, failing open`);

      return null;
    }
  }

  /**
   * Returns `true` when inbound processing must stop because the agent or its
   * channel is over the plan limit. Posts the upgrade card unless the trigger
   * is a link-button action (see class docs).
   */
  async maybeBlock(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    action?: AgentAction
  ): Promise<boolean> {
    if (config.isKeyless) {
      return false;
    }

    const reason = await this.resolveAgentChannelBlockReason(agentId, config);

    if (!reason) {
      return false;
    }

    if (this.shouldPostUpgradeCard(config) && !isLinkButtonActionId(action?.id)) {
      await this.postUpgradeRequiredReply(agentId, config, thread, reason);
    }

    return true;
  }

  /**
   * Returns `true` when inbound processing must stop because a Free-tier
   * organization has reached its included active-conversations limit and this
   * engagement would start a *new* activation. Existing (already-counted)
   * conversations are never blocked — only new ones — so an organization at its
   * limit keeps serving its current threads. Posts the upgrade card before
   * returning. Keyless/demo orgs are governed by their own caps and skipped.
   *
   * `conversation` is omitted for a brand-new thread (not yet persisted); the
   * caller invokes this before creating it so a block can't orphan a
   * Conversation/participants. A brand-new thread is always a NEW activation.
   */
  async maybeBlockConversation(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    conversation?: ConversationEntity
  ): Promise<boolean> {
    if (config.isKeyless) {
      return false;
    }

    const blocked = await this.isConversationBlocked(agentId, config, {
      conversation,
      isDirectMessage: thread.isDM,
    });

    if (!blocked) {
      return false;
    }

    if (this.shouldPostUpgradeCard(config)) {
      await this.postUpgradeRequiredReply(agentId, config, thread, 'conversations', conversation);
    }

    return true;
  }

  /** Web chat returns HTTP 402 on accept; skip in-thread upgrade cards at runtime. */
  private shouldPostUpgradeCard(config: ResolvedAgentConfig): boolean {
    return config.platform !== AgentPlatformEnum.WEB_CHAT;
  }

  private async resolveAgentChannelBlockReason(
    agentId: string,
    config: ResolvedAgentConfig
  ): Promise<Extract<PlanLimitBlockReason, 'agents' | 'channels'> | null> {
    const { agentWithinLimit, channelWithinLimit } = await this.agentEntitlements.checkRuntimeLimits(
      config.organizationId,
      config.environmentId,
      agentId,
      config.providerId
    );

    if (!agentWithinLimit) {
      return 'agents';
    }

    if (!channelWithinLimit) {
      return 'channels';
    }

    return null;
  }

  private async isConversationBlocked(
    agentId: string,
    config: ResolvedAgentConfig,
    params: { conversation?: ConversationEntity; isDirectMessage: boolean }
  ): Promise<boolean> {
    const { blocked } = await this.conversationActivation.shouldBlockFreeTier({
      conversation: params.conversation,
      platform: config.platform,
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      agentId,
      isDirectMessage: params.isDirectMessage,
    });

    return blocked;
  }

  private async resolvePlanLimitBlock(
    agentId: string,
    config: ResolvedAgentConfig,
    params: { includeConversationLimit: boolean; isDirectMessage: boolean; conversation?: ConversationEntity }
  ): Promise<PlanLimitBlockReason | null> {
    const agentChannelReason = await this.resolveAgentChannelBlockReason(agentId, config);

    if (agentChannelReason) {
      return agentChannelReason;
    }

    if (!params.includeConversationLimit) {
      return null;
    }

    const blocked = await this.isConversationBlocked(agentId, config, {
      conversation: params.conversation,
      isDirectMessage: params.isDirectMessage,
    });

    return blocked ? 'conversations' : null;
  }

  /** Fail-soft: failing to post the card must not crash the inbound webhook. */
  private async postUpgradeRequiredReply(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    reason: PlanLimitBlockReason,
    conversation?: ConversationEntity
  ): Promise<void> {
    try {
      const card = buildUpgradeRequiredCard(reason, config.agentIdentifier, config.platform);
      // Pre-conversation gates (agents/channels, brand-new thread at conversations
      // limit) have nothing to attach history to — ephemeral platform delivery only.
      // When an existing conversation is blocked from a new activation, persist so
      // the upgrade card appears in durable web-chat history.
      await this.outboundGateway.replyOnThreadWithCard(
        thread,
        card,
        conversation
          ? {
              persist: {
                conversationId: conversation._id,
                channel: this.conversationService.getPrimaryChannel(conversation),
                agentIdentifier: config.agentIdentifier,
                content: PLAN_LIMIT_BLOCK_MESSAGES[reason],
                richContent: { card },
                environmentId: config.environmentId,
                organizationId: config.organizationId,
              },
            }
          : undefined
      );
    } catch (err) {
      this.logger.warn(err, `[agent:${agentId}] Failed to post plan-limit upgrade reply (${reason})`);
      captureAgentWarning(err, {
        component: 'plan-limit-gate',
        operation: 'post-upgrade-required-reply',
        agentId,
      });
    }
  }
}
