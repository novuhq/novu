import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AgentIntegrationRepository,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  type HumanContactChannelAddresses,
  HumanContactRepository,
  HumanInteractionEntity,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  ENDPOINT_TYPES,
  HumanAddressVerificationStateEnum,
  HumanChannelViaEnum,
  type HumanContactChannelStatus,
} from '@novu/shared';
import { OutboundGateway } from '../../agents/conversation-runtime/egress/outbound.gateway';
import { buildPendingDeliveryContent } from '../../agents/human-relay/human-card.builder';
import type { ReplyContentDto } from '../../agents/shared/dtos/agent-reply-payload.dto';
import { KeylessEmailGateService } from '../../keyless/keyless-email-gate.service';
import { maskEmail } from './mask-email';

export interface ResolvedHumanTarget {
  platform: string;
  platformUserId: string;
  integrationIdentifier: string;
}

const VIA_PROVIDER_IDS: Record<HumanChannelViaEnum, readonly string[]> = {
  [HumanChannelViaEnum.TELEGRAM]: [ChatProviderIdEnum.Telegram],
  [HumanChannelViaEnum.SLACK]: [ChatProviderIdEnum.Slack, ChatProviderIdEnum.Novu],
  [HumanChannelViaEnum.EMAIL]: [EmailProviderIdEnum.AgentEmailInbox],
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
  /** When the human connected / verified it. */
  connectedAt?: string;
}

/** Apps a human can connect themselves from the invite page. */
export type HumanInviteVia = HumanChannelViaEnum.TELEGRAM | HumanChannelViaEnum.SLACK | HumanChannelViaEnum.EMAIL;

const INVITE_VIAS: readonly HumanChannelViaEnum[] = [
  HumanChannelViaEnum.TELEGRAM,
  HumanChannelViaEnum.SLACK,
  HumanChannelViaEnum.EMAIL,
];

export type InviteChannelDescription = {
  via: HumanInviteVia;
  integrationIdentifier: string;
  connected: boolean;
  isDefault: boolean;
  status: HumanAddressVerificationStateEnum;
  /** False when a keyless setup cannot offer this channel. Missing means it can. */
  available?: boolean;
  /** Masked address for address-based channels. */
  address?: string;
  verifiedAt?: string;
  verifiedRequestedAt?: string;
  requestedAt?: string;
};

/**
 * The channel an interaction goes to when the caller doesn't pass `via`: the
 * human's saved default while it is still connected, otherwise the channel
 * they connected first. Email has no connect time until verified, so it comes last.
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

function relativeAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) {
    return 'just now';
  }

  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Resolves where a human interaction gets delivered and performs the one-off
 * DM send through the agents conversation-runtime. Chat platforms bind the
 * human via a ChannelEndpoint; email requires a verified address on
 * HumanContact (double opt-in) — Subscriber.email alone is not enough.
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
    private readonly humanContactRepository: HumanContactRepository,
    private readonly outboundGateway: OutboundGateway,
    private readonly keylessEmailGate: KeylessEmailGateService
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

    if (params.via === HumanChannelViaEnum.EMAIL && this.keylessEmailGate.isBlocked(params.organizationId)) {
      await this.keylessEmailGate.assertAllowed(params);
    }

    const deliverable = await this.findReachableTargets(params, candidates);

    if (
      deliverable.length === 0 &&
      !params.via &&
      this.keylessEmailGate.isBlocked(params.organizationId) &&
      candidates.some((integration) => integration.channel === ChannelTypeEnum.EMAIL) &&
      candidates.every((integration) => integration.channel === ChannelTypeEnum.EMAIL)
    ) {
      await this.keylessEmailGate.assertAllowed(params);
    }

    if (deliverable.length === 0) {
      if (params.via === HumanChannelViaEnum.EMAIL) {
        throw new NotFoundException(await this.emailUnreachableMessage(params));
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

  /** The agent's active invite-page integrations (Telegram, Slack, Email). */
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

  /** The invite page's apps, with connection / verification state and default. */
  async describeInviteChannels(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
  }): Promise<InviteChannelDescription[]> {
    const [channels, { targets, defaultVia }, contact] = await Promise.all([
      this.listInviteChannels(params),
      this.describeReachability(params),
      this.humanContactRepository.findContact(params.environmentId, params.agentId, params.subscriberId),
    ]);

    return channels.map((channel) => {
      if (channel.via === HumanChannelViaEnum.EMAIL) {
        if (this.keylessEmailGate.isBlocked(params.organizationId)) {
          return {
            ...channel,
            connected: false,
            isDefault: false,
            status: HumanAddressVerificationStateEnum.UNVERIFIED,
            available: false,
          };
        }

        return describeEmailInviteChannel(
          channel,
          describeStoredEmail(contact?.addresses?.[HumanChannelViaEnum.EMAIL]),
          defaultVia
        );
      }

      const connected = targets.some((target) => target.integrationIdentifier === channel.integrationIdentifier);

      return {
        ...channel,
        connected,
        isDefault: connected && defaultVia === channel.via,
        status: connected ? HumanAddressVerificationStateEnum.VERIFIED : HumanAddressVerificationStateEnum.UNVERIFIED,
      };
    });
  }

  /**
   * Channel status for `human contacts`. Includes a stored email address even
   * when the relay no longer has an email integration linked.
   */
  async describeContactChannels(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
  }): Promise<HumanContactChannelStatus[]> {
    const channels = await this.describeInviteChannels(params);
    const statuses = channels.map(toContactChannelStatus);

    if (statuses.some((channel) => channel.via === HumanChannelViaEnum.EMAIL)) {
      return statuses;
    }

    const contact = await this.humanContactRepository.findContact(
      params.environmentId,
      params.agentId,
      params.subscriberId
    );
    const email = describeStoredEmail(contact?.addresses?.[HumanChannelViaEnum.EMAIL]);
    if (!email.address) {
      return statuses;
    }

    return [
      ...statuses,
      {
        via: HumanChannelViaEnum.EMAIL,
        status: email.status,
        address: email.address,
        ...(email.verifiedAt ? { verifiedAt: email.verifiedAt } : {}),
        ...(email.verifiedRequestedAt ? { verifiedRequestedAt: email.verifiedRequestedAt } : {}),
        ...(email.requestedAt ? { requestedAt: email.requestedAt } : {}),
      },
    ];
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
   * {@link describeReachability} for a page of contacts in a fixed number of queries.
   * Email is reachable only from that relay's verified address, same as {@link tryResolveTarget}.
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
        ['subscriberId', 'defaultVia', 'addresses']
      ),
    ]);
    const savedDefaults = new Map(contacts.map((contact) => [contact.subscriberId, contact.defaultVia]));
    const verifiedEmails = new Map(
      contacts.flatMap((contact) => {
        const verified = contact.addresses?.[HumanChannelViaEnum.EMAIL]?.verified;
        if (!verified) {
          return [];
        }

        return [[contact.subscriberId, verified] as const];
      })
    );

    for (const subscriber of params.subscribers) {
      const targets = this.reachableTargetsOf(
        subscriber.subscriberId,
        integrations,
        endpoints,
        verifiedEmails.get(subscriber.subscriberId),
        params.organizationId
      );

      result.set(subscriber.subscriberId, {
        targets,
        defaultVia: pickDefaultTarget(targets, savedDefaults.get(subscriber.subscriberId))?.via,
      });
    }

    return result;
  }

  /** Same rules as {@link tryResolveTarget}, over rows that were loaded up front. */
  private reachableTargetsOf(
    subscriberId: string,
    integrations: IntegrationEntity[],
    endpoints: ChannelEndpointEntity[],
    verifiedEmail: { address: string; verifiedAt: string } | undefined,
    organizationId: string
  ): ReachableHumanTarget[] {
    const targets: ReachableHumanTarget[] = [];

    for (const integration of integrations) {
      const via = viaForProviderId(integration.providerId);
      if (!via) {
        continue;
      }

      if (integration.channel === ChannelTypeEnum.EMAIL) {
        if (verifiedEmail && !this.keylessEmailGate.isBlocked(organizationId)) {
          targets.push(emailTarget(verifiedEmail.address, via, integration.identifier, verifiedEmail.verifiedAt));
        }

        continue;
      }

      const endpoint = endpoints.find(
        (candidate) =>
          candidate.subscriberId === subscriberId && candidate.integrationIdentifier === integration.identifier
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

  private async emailUnreachableMessage(params: {
    environmentId: string;
    agentId: string;
    subscriberId: string;
  }): Promise<string> {
    const pending = await this.humanContactRepository.findPendingAddress(
      params.environmentId,
      params.agentId,
      params.subscriberId,
      HumanChannelViaEnum.EMAIL
    );

    if (pending) {
      return (
        `Human "${params.subscriberId}"'s email ${maskEmail(pending.address)} is awaiting verification ` +
        `(sent ${relativeAge(pending.requestedAt)}). Re-run \`human invite ${params.subscriberId} --via email\` to resend.`
      );
    }

    return `Human "${params.subscriberId}" has no verified email address. Run \`human invite ${params.subscriberId} --via email\`.`;
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
    params: { environmentId: string; organizationId: string; agentId: string; subscriberId: string },
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
    params: { environmentId: string; organizationId: string; agentId: string; subscriberId: string },
    integration: IntegrationEntity
  ): Promise<ReachableHumanTarget | null> {
    const via = viaForProviderId(integration.providerId);
    if (!via) {
      return null;
    }

    if (integration.channel === ChannelTypeEnum.EMAIL) {
      if (this.keylessEmailGate.isBlocked(params.organizationId)) {
        return null;
      }

      const verified = await this.humanContactRepository.findVerifiedAddress(
        params.environmentId,
        params.agentId,
        params.subscriberId,
        HumanChannelViaEnum.EMAIL
      );

      if (!verified) {
        return null;
      }

      return {
        via,
        platform: HumanChannelViaEnum.EMAIL,
        platformUserId: verified.address,
        integrationIdentifier: integration.identifier,
        connectedAt: verified.verifiedAt,
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

function describeEmailInviteChannel(
  channel: InviteChannelDescription,
  email: ReturnType<typeof describeStoredEmail>,
  defaultVia: HumanChannelViaEnum | undefined
): InviteChannelDescription {
  return {
    ...channel,
    connected: email.connected,
    isDefault: email.connected && defaultVia === channel.via,
    status: email.status,
    available: true,
    ...(email.address ? { address: email.address } : {}),
    ...(email.verifiedAt ? { verifiedAt: email.verifiedAt } : {}),
    ...(email.verifiedRequestedAt ? { verifiedRequestedAt: email.verifiedRequestedAt } : {}),
    ...(email.requestedAt ? { requestedAt: email.requestedAt } : {}),
  };
}

function describeStoredEmail(slot: HumanContactChannelAddresses | undefined): {
  connected: boolean;
  status: HumanAddressVerificationStateEnum;
  address?: string;
  verifiedAt?: string;
  verifiedRequestedAt?: string;
  requestedAt?: string;
} {
  const verified = slot?.verified;
  const pending = slot?.pending;
  let status = HumanAddressVerificationStateEnum.UNVERIFIED;
  if (verified) {
    status = HumanAddressVerificationStateEnum.VERIFIED;
  } else if (pending) {
    status = HumanAddressVerificationStateEnum.PENDING;
  }

  const rawAddress = verified?.address ?? pending?.address;

  return {
    connected: Boolean(verified),
    status,
    ...(rawAddress ? { address: maskEmail(rawAddress) } : {}),
    ...(verified?.verifiedAt ? { verifiedAt: verified.verifiedAt } : {}),
    ...(verified?.requestedAt ? { verifiedRequestedAt: verified.requestedAt } : {}),
    ...(pending?.requestedAt ? { requestedAt: pending.requestedAt } : {}),
  };
}

function toContactChannelStatus(channel: InviteChannelDescription): HumanContactChannelStatus {
  return {
    via: channel.via,
    status: channel.status,
    ...(channel.address ? { address: channel.address } : {}),
    ...(channel.verifiedAt ? { verifiedAt: channel.verifiedAt } : {}),
    ...(channel.verifiedRequestedAt ? { verifiedRequestedAt: channel.verifiedRequestedAt } : {}),
    ...(channel.requestedAt ? { requestedAt: channel.requestedAt } : {}),
  };
}

function emailTarget(
  email: string,
  via: HumanChannelViaEnum,
  integrationIdentifier: string,
  connectedAt?: string
): ReachableHumanTarget {
  return {
    via,
    platform: HumanChannelViaEnum.EMAIL,
    platformUserId: email,
    integrationIdentifier,
    ...(connectedAt ? { connectedAt } : {}),
  };
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
