import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationRepository, type HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionKindEnum } from '@novu/shared';
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
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(WhatsAppHeldRelease.name);
  }

  async release(scope: ReleaseScope): Promise<void> {
    const { config, subscriberId } = scope;
    if (config.platform !== AgentPlatformEnum.WHATSAPP || !config.isHumanRelay || !subscriberId) {
      return;
    }

    const now = new Date().toISOString();
    let held: HumanInteractionEntity[];
    try {
      held = await this.humanInteractionRepository.findHeldFor(
        config.environmentId,
        config.organizationId,
        subscriberId,
        config.integrationIdentifier,
        now
      );
    } catch (err) {
      this.logger.warn({ err, subscriberId }, 'Could not look for WhatsApp messages held for this person');

      return;
    }

    if (held.length === 0) {
      return;
    }

    // A tap isn't a message the inbox keeps, so nothing else marks their window open.
    if (scope.conversationId) {
      await this.conversationRepository
        .touchActivity(config.environmentId, config.organizationId, scope.conversationId, 'View message', null, {
          humanMessageAt: now,
        })
        .catch((err) => this.logger.warn({ err }, 'Could not mark the WhatsApp window open after a tap'));
    }

    for (const interaction of held) {
      await this.releaseOne(scope, interaction, subscriberId);
    }
  }

  private async releaseOne(scope: ReleaseScope, interaction: HumanInteractionEntity, subscriberId: string) {
    const { environmentId } = scope.config;
    // Taken off the row first, so a second message at the same moment doesn't send it again.
    const hold = await this.humanInteractionRepository.takeHold(environmentId, interaction._id, subscriberId);
    if (!hold) {
      return;
    }

    try {
      const sent = await this.outboundGateway.sendDirectMessage(
        scope.agentId,
        hold.integrationIdentifier,
        scope.platformUserId,
        buildPendingDeliveryContent(interaction)
      );
      await this.humanInteractionRepository.addDelivery(environmentId, interaction._id, {
        subscriberId,
        integrationIdentifier: hold.integrationIdentifier,
        platform: AgentPlatformEnum.WHATSAPP,
        platformMessageId: sent.messageId,
        platformThreadId: sent.platformThreadId,
      });

      const stillHeld = (interaction.held ?? []).some((other) => other.subscriberId !== subscriberId);
      if (interaction.kind === HumanInteractionKindEnum.TELL && !stillHeld) {
        await this.humanInteractionRepository.markDeliveredIfPending(environmentId, interaction._id);
      }
    } catch (err) {
      // Put back, so their next message tries again.
      await this.humanInteractionRepository.addHold(environmentId, interaction._id, hold).catch(() => undefined);
      this.logger.warn(
        { err, interactionIdentifier: interaction.identifier, subscriberId },
        'Could not send a held WhatsApp message'
      );
    }
  }
}
