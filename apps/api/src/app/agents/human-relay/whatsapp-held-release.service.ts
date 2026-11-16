import { Injectable } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import {
  AgentRepository,
  ConversationRepository,
  type HumanInteractionEntity,
  HumanInteractionRepository,
} from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { buildPendingDeliveryContent } from './human-card.builder';

type ReleaseScope = {
  agentId: string;
  config: {
    environmentId: string;
    organizationId: string;
    platform: string;
    integrationIdentifier: string;
    isHumanRelay?: boolean;
  };
  subscriberId?: string | null;
  /** The person's WhatsApp id, which the held message goes to. */
  platformUserId: string;
  /** Set when a tap, not a message, opened the window, so it gets counted as their last message. */
  conversationId?: string;
};

const PAGE_SIZE = 20;
/** A backlog this long is released over their next messages, so one message never sends hundreds at once. */
const MAX_RELEASED_PER_MESSAGE = 200;

/**
 * What an agent sent someone while their WhatsApp window was closed went out as the approved first message and
 * waited. Anything they send the agent opens the window again, typing or tapping "View message", and this sends
 * what waited, oldest first. It runs only for the relay on WhatsApp, and costs one indexed read per message there.
 */
@Injectable()
export class WhatsAppHeldRelease {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly outboundGateway: OutboundGateway,
    private readonly agentRepository: AgentRepository,
    private readonly logger: PinoLogger,
    private readonly featureFlagsService: FeatureFlagsService
  ) {
    this.logger.setContext(WhatsAppHeldRelease.name);
  }

  async release(scope: ReleaseScope): Promise<void> {
    const { config, subscriberId } = scope;
    if (config.platform !== AgentPlatformEnum.WHATSAPP || !config.isHumanRelay || !subscriberId) {
      return;
    }

    const now = new Date().toISOString();

    // A tap isn't a message the inbox keeps, so nothing else marks their window open: any tap does, whether or not
    // something waited for it.
    if (scope.conversationId) {
      await this.conversationRepository
        .touchActivity(config.environmentId, config.organizationId, scope.conversationId, 'View message', null, {
          humanMessageAt: now,
        })
        .catch((err) => this.logger.warn({ err }, 'Could not mark the WhatsApp window open after a tap'));
    }

    const first = await this.findHeld(scope, subscriberId, now, []);
    if (first.length === 0) {
      return;
    }

    // WhatsApp turned off for the organization sends nothing, and a paused agent neither: what is held waits.
    if (!(await this.isWhatsAppEnabled(scope)) || (await this.isPaused(scope))) {
      return;
    }

    // A page at a time, oldest first, until nothing is left. Each row is tried once per message, so one that
    // keeps failing waits for their next message instead of being tried again here.
    const tried: string[] = [];
    let page = first;
    while (page.length > 0 && tried.length < MAX_RELEASED_PER_MESSAGE) {
      for (const interaction of page) {
        tried.push(String(interaction._id));
        await this.releaseOne(scope, interaction, subscriberId);
      }

      page = await this.findHeld(scope, subscriberId, now, tried);
    }
  }

  private async findHeld(
    scope: ReleaseScope,
    subscriberId: string,
    now: string,
    excludeIds: string[]
  ): Promise<HumanInteractionEntity[]> {
    try {
      return await this.humanInteractionRepository.findHeldFor(
        scope.config.environmentId,
        scope.config.organizationId,
        subscriberId,
        scope.config.integrationIdentifier,
        now,
        { limit: PAGE_SIZE, excludeIds, agentId: scope.agentId }
      );
    } catch (err) {
      this.logger.warn({ err, subscriberId }, 'Could not look for WhatsApp messages held for this person');

      return [];
    }
  }

  /** Read only once something is held, so an ordinary message costs no flag read. */
  private async isWhatsAppEnabled(scope: ReleaseScope): Promise<boolean> {
    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AGENT_INBOX_WHATSAPP_ENABLED,
      defaultValue: false,
      organization: { _id: scope.config.organizationId },
      environment: { _id: scope.config.environmentId },
    });
  }

  private async isPaused(scope: ReleaseScope): Promise<boolean> {
    const agent = await this.agentRepository
      .findOne({ _id: scope.agentId, _environmentId: scope.config.environmentId }, ['pausedAt'])
      .catch(() => null);

    return Boolean(agent?.pausedAt);
  }

  private async releaseOne(scope: ReleaseScope, interaction: HumanInteractionEntity, subscriberId: string) {
    const { environmentId, integrationIdentifier } = scope.config;
    // Claimed first, so a second message at the same moment doesn't send it again. It stays on the row until sent.
    const hold = await this.humanInteractionRepository
      .claimHold(environmentId, interaction._id, subscriberId, integrationIdentifier)
      .catch(() => null);
    if (!hold) {
      return;
    }

    let sent: { messageId: string; platformThreadId: string };
    try {
      sent = await this.outboundGateway.sendDirectMessage(
        scope.agentId,
        hold.integrationIdentifier,
        scope.platformUserId,
        buildPendingDeliveryContent(interaction)
      );
    } catch (err) {
      // Not sent, so the claim is let go for their next message to try again.
      await this.humanInteractionRepository
        .releaseHoldClaim(environmentId, interaction._id, hold)
        .catch(() => undefined);
      this.logger.warn(
        { err, interactionIdentifier: interaction.identifier, subscriberId },
        'Could not send a held WhatsApp message'
      );

      return;
    }

    // Sent: whatever happens to the bookkeeping now, the claim is never let go, so it is never sent twice. Each
    // write is tried a few times, as a claim left on the row goes stale and would send the message again.
    try {
      await withRetries(() =>
        this.humanInteractionRepository.completeHold(environmentId, interaction._id, hold, {
          subscriberId,
          integrationIdentifier: hold.integrationIdentifier,
          platform: AgentPlatformEnum.WHATSAPP,
          platformMessageId: sent.messageId,
          platformThreadId: sent.platformThreadId,
        })
      );
      await withRetries(() =>
        this.humanInteractionRepository.markTellDeliveredWhenReleased(environmentId, interaction._id)
      );
    } catch (err) {
      this.logger.warn(
        { err, interactionIdentifier: interaction.identifier, subscriberId },
        'Sent a held WhatsApp message but could not record it'
      );
    }
  }
}

const RECORD_ATTEMPTS = 3;

async function withRetries(write: () => Promise<void>): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RECORD_ATTEMPTS; attempt += 1) {
    try {
      return await write();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}
