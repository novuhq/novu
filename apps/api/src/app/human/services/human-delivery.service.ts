import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AgentIntegrationRepository,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  HumanInteractionEntity,
  IntegrationEntity,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  ENDPOINT_TYPES,
  HumanChannelViaEnum,
} from '@novu/shared';
import { OutboundGateway } from '../../agents/conversation-runtime/egress/outbound.gateway';
import { buildPendingContent } from '../../agents/human-relay/human-card.builder';

export interface ResolvedHumanTarget {
  platform: string;
  platformUserId: string;
  integrationIdentifier: string;
}

const VIA_PROVIDER_IDS: Record<HumanChannelViaEnum, readonly string[]> = {
  [HumanChannelViaEnum.TELEGRAM]: [ChatProviderIdEnum.Telegram],
  [HumanChannelViaEnum.SLACK]: [ChatProviderIdEnum.Slack, ChatProviderIdEnum.Novu],
  [HumanChannelViaEnum.EMAIL]: [EmailProviderIdEnum.NovuAgent, EmailProviderIdEnum.Novu],
};

function viaForProviderId(providerId: string): HumanChannelViaEnum | null {
  for (const [via, providerIds] of Object.entries(VIA_PROVIDER_IDS) as Array<
    [HumanChannelViaEnum, readonly string[]]
  >) {
    if (providerIds.includes(providerId)) {
      return via;
    }
  }

  return null;
}

/**
 * Resolves where a human interaction gets delivered and performs the one-off
 * DM send through the agents conversation-runtime. Chat platforms bind the
 * human via a ChannelEndpoint; email identity lives on `Subscriber.email`
 * (same model as the agents email channel — no endpoint row).
 *
 * Callers pass a channel preference (`via`) — never a concrete integration id.
 * The concrete integration is chosen from the relay agent's linked integrations
 * that the human can actually receive on.
 */
@Injectable()
export class HumanDeliveryService {
  constructor(
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly outboundGateway: OutboundGateway
  ) {}

  async resolveChannel(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
    via?: HumanChannelViaEnum;
  }): Promise<ResolvedHumanTarget> {
    const links = await this.agentIntegrationRepository.find(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        _agentId: params.agentId,
        disconnectedAt: null,
      },
      '*'
    );

    if (links.length === 0) {
      throw new NotFoundException(
        `Relay agent has no linked channels. Run \`human setup\` to connect telegram, slack, or email.`
      );
    }

    const integrations = await this.integrationRepository.find({
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
      _id: { $in: links.map((link) => link._integrationId) },
    });

    const candidates = params.via
      ? integrations.filter((integration) => VIA_PROVIDER_IDS[params.via!].includes(integration.providerId))
      : integrations;

    if (params.via && candidates.length === 0) {
      throw new NotFoundException(
        `No ${params.via} channel is linked to the relay. Run \`human setup ${params.via}\` first.`
      );
    }

    const deliverable: ResolvedHumanTarget[] = [];

    for (const integration of candidates) {
      const resolved = await this.tryResolveTarget(params, integration);
      if (resolved) {
        deliverable.push(resolved);
      }
    }

    if (deliverable.length === 0) {
      if (params.via === HumanChannelViaEnum.EMAIL) {
        throw new NotFoundException(
          `Human "${params.subscriberId}" has no email address on file. Run \`human setup email\` to add one.`
        );
      }

      throw new NotFoundException(
        params.via
          ? `Human "${params.subscriberId}" has no linked ${params.via} endpoint. Run \`human setup ${params.via}\`.`
          : `Human "${params.subscriberId}" has no linked channel. Run \`human setup\` to connect one.`
      );
    }

    if (!params.via && deliverable.length > 1) {
      const platforms = [...new Set(deliverable.map((target) => target.platform))].join(', ');

      throw new BadRequestException(
        `Human "${params.subscriberId}" is reachable on multiple channels (${platforms}). Pass \`via\` to pick one.`
      );
    }

    return deliverable[0];
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

  private async tryResolveTarget(
    params: { environmentId: string; organizationId: string; subscriberId: string },
    integration: IntegrationEntity
  ): Promise<ResolvedHumanTarget | null> {
    const via = viaForProviderId(integration.providerId);
    if (!via) {
      return null;
    }

    if (integration.channel === ChannelTypeEnum.EMAIL) {
      const subscriber = await this.subscriberRepository.findOne({
        _environmentId: params.environmentId,
        subscriberId: params.subscriberId,
      });

      if (!subscriber?.email) {
        return null;
      }

      return {
        platform: HumanChannelViaEnum.EMAIL,
        platformUserId: subscriber.email,
        integrationIdentifier: integration.identifier,
      };
    }

    const endpoint = await this.channelEndpointRepository.findOne({
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
      subscriberId: params.subscriberId,
      integrationIdentifier: integration.identifier,
    });

    if (!endpoint) {
      return null;
    }

    return this.toTarget(endpoint, via, integration.identifier);
  }

  private toTarget(
    endpoint: ChannelEndpointEntity,
    via: HumanChannelViaEnum,
    integrationIdentifier: string
  ): ResolvedHumanTarget | null {
    switch (endpoint.type) {
      case ENDPOINT_TYPES.TELEGRAM_CHAT:
        return {
          platform: via,
          platformUserId: (endpoint.endpoint as { chatId: string }).chatId,
          integrationIdentifier,
        };
      case ENDPOINT_TYPES.SLACK_USER:
        return {
          platform: via,
          platformUserId: (endpoint.endpoint as { userId: string }).userId,
          integrationIdentifier,
        };
      case ENDPOINT_TYPES.SLACK_CHANNEL:
        return {
          platform: via,
          platformUserId: (endpoint.endpoint as { channelId: string }).channelId,
          integrationIdentifier,
        };
      case ENDPOINT_TYPES.MS_TEAMS_USER:
        return {
          platform: via,
          platformUserId: (endpoint.endpoint as { userId: string }).userId,
          integrationIdentifier,
        };
      default:
        return null;
    }
  }
}
