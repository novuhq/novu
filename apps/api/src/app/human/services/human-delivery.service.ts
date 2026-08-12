import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelEndpointEntity, ChannelEndpointRepository, HumanInteractionEntity } from '@novu/dal';
import { ENDPOINT_TYPES } from '@novu/shared';
import { buildPendingContent } from '../../agents/human-relay/human-card.builder';
import { OutboundGateway } from '../../agents/conversation-runtime/egress/outbound.gateway';

export interface ResolvedHumanTarget {
  platform: string;
  platformUserId: string;
}

/**
 * Resolves where a human interaction gets delivered (the subscriber's linked
 * channel endpoint on the relay integration) and performs the one-off DM send
 * through the agents conversation-runtime.
 */
@Injectable()
export class HumanDeliveryService {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly outboundGateway: OutboundGateway
  ) {}

  async resolveTarget(params: {
    environmentId: string;
    organizationId: string;
    subscriberId: string;
    integrationIdentifier: string;
  }): Promise<ResolvedHumanTarget> {
    const endpoint = await this.channelEndpointRepository.findOne({
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
      subscriberId: params.subscriberId,
      integrationIdentifier: params.integrationIdentifier,
    });

    if (!endpoint) {
      throw new NotFoundException(
        `Human "${params.subscriberId}" has no linked channel on integration "${params.integrationIdentifier}". Run \`human setup\` to connect one.`
      );
    }

    return this.toTarget(endpoint);
  }

  /** Delivers the pending message and returns the platform refs for stamping. */
  async deliver(
    interaction: HumanInteractionEntity,
    target: ResolvedHumanTarget
  ): Promise<{ platformMessageId: string; platformThreadId: string }> {
    const sent = await this.outboundGateway.sendDirectMessage(
      interaction._agentId,
      interaction.integrationIdentifier,
      target.platformUserId,
      buildPendingContent(interaction)
    );

    return { platformMessageId: sent.messageId, platformThreadId: sent.platformThreadId };
  }

  private toTarget(endpoint: ChannelEndpointEntity): ResolvedHumanTarget {
    switch (endpoint.type) {
      case ENDPOINT_TYPES.TELEGRAM_CHAT:
        return { platform: 'telegram', platformUserId: (endpoint.endpoint as { chatId: string }).chatId };
      case ENDPOINT_TYPES.SLACK_USER:
        return { platform: 'slack', platformUserId: (endpoint.endpoint as { userId: string }).userId };
      case ENDPOINT_TYPES.SLACK_CHANNEL:
        return { platform: 'slack', platformUserId: (endpoint.endpoint as { channelId: string }).channelId };
      case ENDPOINT_TYPES.MS_TEAMS_USER:
        return { platform: 'teams', platformUserId: (endpoint.endpoint as { userId: string }).userId };
      default:
        throw new NotFoundException(
          `Channel endpoint type "${endpoint.type}" is not supported for human interactions yet.`
        );
    }
  }
}
