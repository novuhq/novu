import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AgentIntegrationRepository,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  HumanContactRepository,
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
import { buildPendingDeliveryContent } from '../../agents/human-relay/human-card.builder';
import type { ReplyContentDto } from '../../agents/shared/dtos/agent-reply-payload.dto';

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

/** A channel the human can receive on right now. */
export interface ReachableHumanTarget extends ResolvedHumanTarget {
  via: HumanChannelViaEnum;
  /** When the human connected it. Absent for email, whose identity lives on the subscriber. */
  connectedAt?: string;
}

/** Chat apps a human can connect themselves from the invite page. */
export type HumanInviteVia = HumanChannelViaEnum.TELEGRAM | HumanChannelViaEnum.SLACK;

const INVITE_VIAS: readonly HumanChannelViaEnum[] = [HumanChannelViaEnum.TELEGRAM, HumanChannelViaEnum.SLACK];

/**
 * The channel an interaction goes to when the caller doesn't pass `via`: the
 * human's saved default while it is still connected, otherwise the channel
 * they connected first. Email has no connect time, so it comes last.
 */
export function pickDefaultTarget<T extends ReachableHumanTarget>(
  targets: T[],
  defaultVia?: HumanChannelViaEnum
): T | undefined {
  const preferred = defaultVia ? targets.find((target) => target.via === defaultVia) : undefined;

  return preferred ?? [...targets].sort(byConnectedAt)[0];
}

function byConnectedAt(a: ReachableHumanTarget, b: ReachableHumanTarget): number {
  if (!a.connectedAt || !b.connectedAt) {
    return Number(!a.connectedAt) - Number(!b.connectedAt);
  }

  return new Date(a.connectedAt).getTime() - new Date(b.connectedAt).getTime();
}

function toResolvedTarget({
  platform,
  platformUserId,
  integrationIdentifier,
}: ReachableHumanTarget): ResolvedHumanTarget {
  return { platform, platformUserId, integrationIdentifier };
}

/**
 * Resolves where a human interaction gets delivered and performs the one-off
 * DM send through the agents conversation-runtime. Chat platforms bind the
 * human via a ChannelEndpoint; email identity lives on `Subscriber.email`
 * (same model as the agents email channel — no endpoint row).
 *
 * Callers pass a channel preference (`via`) — never a concrete integration id.
 * The concrete integration is chosen from the sending agent's linked
 * integrations that the human can actually receive on.
 */
@Injectable()
export class HumanDeliveryService {
  constructor(
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly outboundGateway: OutboundGateway
  ) {}

  async resolveChannel(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
    via?: HumanChannelViaEnum;
  }): Promise<ResolvedHumanTarget> {
    const integrations = await this.findLinkedIntegrations(params);

    if (integrations.length === 0) {
      throw new NotFoundException(
        `Agent has no linked channels. Connect telegram, slack, or email to this agent, or run \`human setup\`.`
      );
    }

    const { via } = params;
    const candidates = via
      ? integrations.filter((integration) => VIA_PROVIDER_IDS[via].includes(integration.providerId))
      : integrations;

    if (params.via && candidates.length === 0) {
      throw new NotFoundException(
        `No ${params.via} channel is linked to this agent. Connect ${params.via} or run \`human setup ${params.via}\`.`
      );
    }

    const deliverable = await this.findReachableTargets(params, candidates);

    if (deliverable.length === 0) {
      if (params.via === HumanChannelViaEnum.EMAIL) {
        throw new NotFoundException(
          `Human "${params.subscriberId}" has no email address on file. Run \`human invite ${params.subscriberId} --via email\`.`
        );
      }

      throw new NotFoundException(
        params.via
          ? `Human "${params.subscriberId}" has no linked ${params.via} endpoint. Run \`human invite ${params.subscriberId} --via ${params.via}\`.`
          : `Human "${params.subscriberId}" has no linked channel. Run \`human invite ${params.subscriberId}\`.`
      );
    }

    if (params.via || deliverable.length === 1) {
      return toResolvedTarget(deliverable[0]);
    }

    const contact = await this.humanContactRepository.findContact(
      params.environmentId,
      params.agentId,
      params.subscriberId
    );

    return toResolvedTarget(pickDefaultTarget(deliverable, contact?.defaultVia) ?? deliverable[0]);
  }

  /** The agent's active Telegram and Slack integrations: the apps offered on the invite page. */
  async listInviteChannels(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
  }): Promise<Array<{ via: HumanInviteVia; integrationIdentifier: string }>> {
    const channels: Array<{ via: HumanInviteVia; integrationIdentifier: string }> = [];

    for (const integration of await this.findLinkedIntegrations(params)) {
      const via = viaForProviderId(integration.providerId);

      if (integration.active && via && INVITE_VIAS.includes(via) && !channels.some((channel) => channel.via === via)) {
        channels.push({ via: via as HumanInviteVia, integrationIdentifier: integration.identifier });
      }
    }

    return channels;
  }

  /** The invite page's apps, with whether the human is connected on each and which one is their default. */
  async describeInviteChannels(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
  }): Promise<Array<{ via: HumanInviteVia; integrationIdentifier: string; connected: boolean; isDefault: boolean }>> {
    const [channels, { targets, defaultVia }] = await Promise.all([
      this.listInviteChannels(params),
      this.describeReachability(params),
    ]);

    return channels.map((channel) => {
      const connected = targets.some((target) => target.integrationIdentifier === channel.integrationIdentifier);

      return { ...channel, connected, isDefault: connected && defaultVia === channel.via };
    });
  }

  /** Where the human can be reached right now, and which channel they get when no `via` is passed. */
  async describeReachability(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
  }): Promise<{ targets: ReachableHumanTarget[]; defaultVia?: HumanChannelViaEnum }> {
    const targets = await this.findReachableTargets(params, await this.findLinkedIntegrations(params));
    const contact = await this.humanContactRepository.findContact(
      params.environmentId,
      params.agentId,
      params.subscriberId
    );

    return { targets, defaultVia: pickDefaultTarget(targets, contact?.defaultVia)?.via };
  }

  /**
   * {@link describeReachability} for a page of contacts in a fixed number of queries. Takes the
   * subscribers' emails from the caller, which has just loaded them.
   */
  async describeReachabilityForMany(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscribers: Array<{ subscriberId: string; email?: string }>;
  }): Promise<Map<string, { targets: ReachableHumanTarget[]; defaultVia?: HumanChannelViaEnum }>> {
    const result = new Map<string, { targets: ReachableHumanTarget[]; defaultVia?: HumanChannelViaEnum }>();
    const subscriberIds = params.subscribers.map(({ subscriberId }) => subscriberId);
    const integrations = subscriberIds.length > 0 ? await this.findLinkedIntegrations(params) : [];

    if (integrations.length === 0) {
      return result;
    }

    const chatIdentifiers = integrations
      .filter((integration) => integration.channel !== ChannelTypeEnum.EMAIL)
      .map((integration) => integration.identifier);
    const [endpoints, contacts] = await Promise.all([
      chatIdentifiers.length > 0
        ? this.channelEndpointRepository.find(
            {
              _environmentId: params.environmentId,
              _organizationId: params.organizationId,
              subscriberId: { $in: subscriberIds },
              integrationIdentifier: { $in: chatIdentifiers },
            },
            '',
            { sort: { _id: 1 } }
          )
        : [],
      this.humanContactRepository.find(
        { _environmentId: params.environmentId, _agentId: params.agentId, subscriberId: { $in: subscriberIds } },
        ['subscriberId', 'defaultVia']
      ),
    ]);
    const savedDefaults = new Map(contacts.map((contact) => [contact.subscriberId, contact.defaultVia]));

    for (const subscriber of params.subscribers) {
      const targets = this.reachableTargetsOf(subscriber, integrations, endpoints);

      result.set(subscriber.subscriberId, {
        targets,
        defaultVia: pickDefaultTarget(targets, savedDefaults.get(subscriber.subscriberId))?.via,
      });
    }

    return result;
  }

  /** Same rules as {@link tryResolveTarget}, over rows that were loaded up front. */
  private reachableTargetsOf(
    subscriber: { subscriberId: string; email?: string },
    integrations: IntegrationEntity[],
    endpoints: ChannelEndpointEntity[]
  ): ReachableHumanTarget[] {
    const targets: ReachableHumanTarget[] = [];

    for (const integration of integrations) {
      const via = viaForProviderId(integration.providerId);
      if (!via) {
        continue;
      }

      if (integration.channel === ChannelTypeEnum.EMAIL) {
        if (subscriber.email) {
          targets.push(emailTarget(subscriber.email, via, integration.identifier));
        }

        continue;
      }

      const endpoint = endpoints.find(
        (candidate) =>
          candidate.subscriberId === subscriber.subscriberId &&
          candidate.integrationIdentifier === integration.identifier
      );
      const target = endpoint ? this.toTarget(endpoint, via, integration.identifier) : null;

      if (target) {
        targets.push(target);
      }
    }

    return targets;
  }

  /** Delivers the pending message and returns the platform refs for stamping. */
  async deliver(
    interaction: HumanInteractionEntity,
    target: ResolvedHumanTarget
  ): Promise<{ platformMessageId: string; platformThreadId: string }> {
    return this.deliverContent(interaction._agentId, target, buildPendingDeliveryContent(interaction));
  }

  /** One-off DM of arbitrary content (e.g. the keyless sign-up CTA) to an already-resolved target. */
  async deliverContent(
    agentId: string,
    target: ResolvedHumanTarget,
    content: ReplyContentDto
  ): Promise<{ platformMessageId: string; platformThreadId: string }> {
    const sent = await this.outboundGateway.sendDirectMessage(
      agentId,
      target.integrationIdentifier,
      target.platformUserId,
      content
    );

    return { platformMessageId: sent.messageId, platformThreadId: sent.platformThreadId };
  }

  private async findLinkedIntegrations(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
  }): Promise<IntegrationEntity[]> {
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
      return [];
    }

    return this.integrationRepository.find({
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
      _id: { $in: links.map((link) => link._integrationId) },
    });
  }

  private async findReachableTargets(
    params: { environmentId: string; organizationId: string; subscriberId: string },
    integrations: IntegrationEntity[]
  ): Promise<ReachableHumanTarget[]> {
    const reachable: ReachableHumanTarget[] = [];

    for (const integration of integrations) {
      const resolved = await this.tryResolveTarget(params, integration);
      if (resolved) {
        reachable.push(resolved);
      }
    }

    return reachable;
  }

  private async tryResolveTarget(
    params: { environmentId: string; organizationId: string; subscriberId: string },
    integration: IntegrationEntity
  ): Promise<ReachableHumanTarget | null> {
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

      return emailTarget(subscriber.email, via, integration.identifier);
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
  ): ReachableHumanTarget | null {
    const platformUserId = platformUserIdOf(endpoint);

    if (!platformUserId) {
      return null;
    }

    return {
      via,
      platform: via,
      platformUserId,
      integrationIdentifier,
      connectedAt: endpoint.createdAt,
    };
  }
}

function emailTarget(email: string, via: HumanChannelViaEnum, integrationIdentifier: string): ReachableHumanTarget {
  return { via, platform: HumanChannelViaEnum.EMAIL, platformUserId: email, integrationIdentifier };
}

function platformUserIdOf(endpoint: ChannelEndpointEntity): string | undefined {
  switch (endpoint.type) {
    case ENDPOINT_TYPES.TELEGRAM_CHAT:
      return (endpoint.endpoint as { chatId: string }).chatId;
    case ENDPOINT_TYPES.SLACK_USER:
    case ENDPOINT_TYPES.MS_TEAMS_USER:
      return (endpoint.endpoint as { userId: string }).userId;
    case ENDPOINT_TYPES.SLACK_CHANNEL:
      return (endpoint.endpoint as { channelId: string }).channelId;
    default:
      return undefined;
  }
}
