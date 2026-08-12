import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  HumanInteractionEntity,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ENDPOINT_TYPES } from '@novu/shared';
import { buildPendingContent } from '../../agents/human-relay/human-card.builder';
import { OutboundGateway } from '../../agents/conversation-runtime/egress/outbound.gateway';

export interface ResolvedHumanTarget {
  platform: string;
  platformUserId: string;
}

/**
 * Resolves where a human interaction gets delivered and performs the one-off
 * DM send through the agents conversation-runtime. Chat platforms bind the
 * human via a ChannelEndpoint; email identity lives on `Subscriber.email`
 * (same model as the agents email channel — no endpoint row).
 */
@Injectable()
export class HumanDeliveryService {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly outboundGateway: OutboundGateway
  ) {}

  async resolveTarget(params: {
    environmentId: string;
    organizationId: string;
    subscriberId: string;
    integrationIdentifier: string;
  }): Promise<ResolvedHumanTarget> {
    const integration = await this.integrationRepository.findOne({
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
      identifier: params.integrationIdentifier,
    });

    if (!integration) {
      throw new NotFoundException(
        `Integration "${params.integrationIdentifier}" was not found. Run \`human setup\` to connect a channel.`
      );
    }

    if (integration.channel === ChannelTypeEnum.EMAIL) {
      return this.resolveEmailTarget(params);
    }

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

  private async resolveEmailTarget(params: {
    environmentId: string;
    subscriberId: string;
  }): Promise<ResolvedHumanTarget> {
    const subscriber = await this.subscriberRepository.findOne({
      _environmentId: params.environmentId,
      subscriberId: params.subscriberId,
    });

    if (!subscriber?.email) {
      throw new NotFoundException(
        `Human "${params.subscriberId}" has no email address on file. Run \`human setup email\` to add one.`
      );
    }

    return { platform: 'email', platformUserId: subscriber.email };
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
