import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, resolvePublishedAgentInboxAddress } from '@novu/application-generic';
import {
  type AgentEntity,
  AgentIntegrationRepository,
  AgentRepository,
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
  ENDPOINT_TYPES,
  HumanAddressVerificationStateEnum,
  HumanChannelViaEnum,
  type HumanContactChannelStatus,
} from '@novu/shared';
import { OutboundGateway } from '../../agents/conversation-runtime/egress/outbound.gateway';
import { buildHumanOpenActionId } from '../../agents/human-relay/human-action-id';
import { buildPendingDeliveryContent } from '../../agents/human-relay/human-card.builder';
import { HUMAN_RELAY_DEFAULT_NAME } from '../../agents/human-relay/human-relay-identity';
import {
  provedWhatsAppNumberOf,
  whatsAppNumberLastCodeAtOf,
  whatsAppNumberProvedAtOf,
} from '../../agents/human-relay/whatsapp-number-proof';
import type { ReplyContentDto } from '../../agents/shared/dtos/agent-reply-payload.dto';
import { normalizePhoneForMeta } from '../../agents/shared/util/phone-normalization';
import {
  extractMetaError,
  sendNamedWhatsAppTemplate,
} from '../../integrations/usecases/whatsapp/whatsapp-graph-api.utils';
import { KeylessEmailGateService } from '../../keyless/keyless-email-gate.service';
import { type ContactHandle, describeContactHandle, readContactHandle } from './contact-handle';
import { HumanChannelGate } from './human-channel-gate.service';
import { VIA_PROVIDER_IDS, viaForProviderId } from './human-channel-via';
import { maskEmail } from './mask-email';
import {
  WHATSAPP_MAX_REPLY_BUTTONS,
  WHATSAPP_TOO_MANY_BUTTONS,
  WHATSAPP_WINDOW_CLOSED,
  WhatsAppUndeliverableException,
  type WhatsAppUnfit,
} from './whatsapp-delivery.errors';
import { AGENT_NAME_VARIABLE, FIRST_MESSAGE_LANGUAGE } from './whatsapp-first-message';
import { WhatsAppFirstMessageService } from './whatsapp-first-message.service';
import { type WhatsAppWindow, WhatsAppWindowService } from './whatsapp-window.service';

export interface ResolvedHumanTarget {
  platform: string;
  platformUserId: string;
  integrationIdentifier: string;
  /**
   * WhatsApp only: their 24-hour window is closed, so this approved template goes out instead and the message is
   * held until they reply.
   */
  firstMessage?: { templateName: string };
}

/** A channel the human can receive on right now. */
export interface ReachableHumanTarget extends ResolvedHumanTarget {
  via: HumanChannelViaEnum;
  /** When the human connected / verified it. */
  connectedAt?: string;
  /** How they show on that chat app, as far as it is known. Absent for email. */
  handle?: ContactHandle;
  /** WhatsApp only, where it was read: whether its 24-hour window lets a message through right now. */
  window?: WhatsAppWindow;
  /** WhatsApp only: when the number last sent a code message, which is never stored but opened a window. */
  lastCodeAt?: string;
}

/** Apps a human can connect themselves from the invite page. */
export type HumanInviteVia =
  | HumanChannelViaEnum.TELEGRAM
  | HumanChannelViaEnum.SLACK
  | HumanChannelViaEnum.WHATSAPP
  | HumanChannelViaEnum.EMAIL;

const INVITE_VIAS: readonly HumanChannelViaEnum[] = [
  HumanChannelViaEnum.TELEGRAM,
  HumanChannelViaEnum.SLACK,
  HumanChannelViaEnum.WHATSAPP,
  HumanChannelViaEnum.EMAIL,
];

export type InviteChannelDescription = {
  via: HumanInviteVia;
  integrationIdentifier: string;
  connected: boolean;
  isDefault: boolean;
  status: HumanAddressVerificationStateEnum;
  /** False when a keyless setup cannot offer this channel. */
  available: boolean;
  /** Masked address for address-based channels. */
  address?: string;
  verifiedAt?: string;
  verifiedRequestedAt?: string;
  requestedAt?: string;
  /** How the human shows on a connected chat app: `@username` on Telegram, their name on Slack. */
  handle?: string;
  /** The Slack workspace they are in, such as `acme.slack.com`. */
  workspace?: string;
};

/**
 * The channel an interaction goes to when the caller doesn't pass `via`: the
 * human's saved default while it is still connected, otherwise the chat app
 * they connected first. Email comes last, however early it was verified: someone
 * who connects a chat app wants to be reached there unless they choose email.
 */
export function pickDefaultTarget<T extends ReachableHumanTarget>(
  targets: T[],
  defaultVia?: HumanChannelViaEnum
): T | undefined {
  const preferred = defaultVia ? targets.find((target) => target.via === defaultVia) : undefined;

  return preferred ?? [...targets].sort(byConnection)[0];
}

function byConnection(a: ReachableHumanTarget, b: ReachableHumanTarget): number {
  const emailLast = Number(a.via === HumanChannelViaEnum.EMAIL) - Number(b.via === HumanChannelViaEnum.EMAIL);
  if (emailLast !== 0) {
    return emailLast;
  }

  if (!a.connectedAt || !b.connectedAt) {
    return Number(!a.connectedAt) - Number(!b.connectedAt);
  }

  return new Date(a.connectedAt).getTime() - new Date(b.connectedAt).getTime();
}

function toResolvedTarget({
  platform,
  platformUserId,
  integrationIdentifier,
  firstMessage,
}: ReachableHumanTarget): ResolvedHumanTarget {
  return { platform, platformUserId, integrationIdentifier, ...(firstMessage ? { firstMessage } : {}) };
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
    private readonly keylessEmailGate: KeylessEmailGateService,
    private readonly channelGate: HumanChannelGate,
    private readonly whatsAppWindow: WhatsAppWindowService,
    private readonly firstMessage: WhatsAppFirstMessageService,
    private readonly agentRepository: AgentRepository
  ) {}

  async resolveChannel(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
    via?: HumanChannelViaEnum;
    /**
     * Mailbox named on this send. Skips the verified-address lookup and delivers
     * here. Contact-id sends omit it. Not a reachability signal.
     */
    explicitEmail?: string;
    /**
     * Buttons on the card being sent. WhatsApp shows at most three, so above that a WhatsApp target is skipped,
     * or refused when it was asked for or is all that is left.
     */
    buttons?: number;
  }): Promise<ResolvedHumanTarget> {
    const explicitEmail = params.explicitEmail;
    if (explicitEmail) {
      return this.resolveExplicitEmail({ ...params, explicitEmail });
    }

    const integrations = await this.findLinkedIntegrations(params);

    if (integrations.length === 0) {
      throw new NotFoundException(
        `Agent has no linked channels. Connect telegram, slack, or email to this agent, or run \`npx @agentinbox/cli setup\`.`
      );
    }

    const { via } = params;
    const candidates = via
      ? integrations.filter((integration) => VIA_PROVIDER_IDS[via].includes(integration.providerId))
      : integrations;

    if (params.via && candidates.length === 0) {
      throw new NotFoundException(
        `No ${params.via} channel is linked to this agent. Connect ${params.via} or run \`npx @agentinbox/cli channel add ${params.via}\`.`
      );
    }

    const deliverable = await this.findReachableTargets(params, candidates);

    if (deliverable.length === 0) {
      // A keyless org can never reach email, so an email-only agent is a gate
      // problem (403 with a claim link), not a missing endpoint (404).
      if (candidates.every((integration) => integration.channel === ChannelTypeEnum.EMAIL)) {
        await this.keylessEmailGate.assertAllowed(params);
      }

      if (params.via === HumanChannelViaEnum.EMAIL) {
        throw new NotFoundException(await this.emailUnreachableMessage(params));
      }

      throw new NotFoundException(
        params.via
          ? `Human "${params.subscriberId}" has no linked ${params.via} endpoint. Run \`human contact invite ${params.subscriberId} --via ${params.via}\`.`
          : `Human "${params.subscriberId}" has no linked channel. Run \`human contact invite ${params.subscriberId}\`.`
      );
    }

    const usable = await this.withoutUnfitWhatsApp(params, deliverable, integrations);

    if (params.via || usable.length === 1) {
      return toResolvedTarget(usable[0]);
    }

    const contact = await this.humanContactRepository.findContact(
      params.environmentId,
      params.agentId,
      params.subscriberId
    );

    return toResolvedTarget(pickDefaultTarget(usable, contact?.defaultVia) ?? usable[0]);
  }

  /**
   * Drops a WhatsApp target that can't carry this send: its 24-hour window is shut, or the card has more buttons
   * than WhatsApp shows. When WhatsApp was asked for, or nothing else is left, the send is refused instead, with the
   * person's other channels that still work. Never empty when it returns.
   */
  private async withoutUnfitWhatsApp(
    params: { environmentId: string; organizationId: string; agentId: string; subscriberId: string; buttons?: number },
    targets: ReachableHumanTarget[],
    integrations: IntegrationEntity[]
  ): Promise<ReachableHumanTarget[]> {
    const fits: ReachableHumanTarget[] = [];
    const windowClosed: ReachableHumanTarget[] = [];
    let refused: WhatsAppUnfit | undefined;

    for (const target of targets) {
      const unfit = await this.whatsAppUnfit(params, target, integrations);
      if (unfit) {
        refused ??= unfit;
        if (unfit.reason === WHATSAPP_WINDOW_CLOSED) {
          windowClosed.push(target);
        }
      } else {
        fits.push(target);
      }
    }

    if (!refused || fits.length > 0) {
      return fits;
    }

    // Only a closed window is waited out: the approved first message goes out now, and the message when they reply.
    for (const target of windowClosed) {
      const firstMessage = await this.approvedFirstMessage(integrations, target.integrationIdentifier);
      if (firstMessage) {
        return [{ ...target, firstMessage }];
      }
    }

    throw new WhatsAppUndeliverableException(
      params.subscriberId,
      refused,
      await this.otherReachableVias(params, integrations)
    );
  }

  /** The approved first-message template on this WhatsApp integration, if there is one. */
  async approvedFirstMessage(
    integrations: IntegrationEntity[],
    integrationIdentifier: string
  ): Promise<{ templateName: string } | undefined> {
    const integration = integrations.find((candidate) => candidate.identifier === integrationIdentifier);
    const approved = integration ? (await this.firstMessage.read(integration))?.approved : undefined;

    return approved ? { templateName: approved.name } : undefined;
  }

  /**
   * Why an existing WhatsApp thread can't take this send, or `null` when it can: the same window and button checks
   * as a new send, for the person the thread is with. Their code messages count toward the window like any other.
   */
  async whatsAppThreadUnfit(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    /** The contact the thread is with, when known. */
    subscriberId?: string;
    integrationId: string;
    platformThreadId: string;
    buttons?: number;
  }): Promise<WhatsAppUnfit | null> {
    const integration = (await this.findLinkedIntegrations(params)).find(
      (candidate) => String(candidate._id) === String(params.integrationId)
    );
    const waId = params.platformThreadId.split(':').pop() ?? '';
    const endpoint =
      integration && params.subscriberId
        ? (
            await this.channelEndpointRepository.find(
              {
                _environmentId: params.environmentId,
                _organizationId: params.organizationId,
                subscriberId: params.subscriberId,
                integrationIdentifier: integration.identifier,
                type: ENDPOINT_TYPES.PHONE,
              },
              ''
            )
          ).find((candidate) => platformUserIdOf(candidate) === waId)
        : undefined;

    return this.whatsAppUnfit(
      params,
      {
        via: HumanChannelViaEnum.WHATSAPP,
        platformUserId: waId,
        integrationIdentifier: integration?.identifier ?? '',
        ...(endpoint ? { lastCodeAt: whatsAppNumberLastCodeAtOf(endpoint) } : {}),
      },
      integration ? [integration] : []
    );
  }

  /** Why WhatsApp can't carry this send to the target, or `null` when it can (or the target isn't WhatsApp). */
  async whatsAppUnfit(
    params: { environmentId: string; organizationId: string; buttons?: number },
    target: Pick<
      ReachableHumanTarget,
      'via' | 'platformUserId' | 'integrationIdentifier' | 'connectedAt' | 'lastCodeAt'
    >,
    integrations: IntegrationEntity[]
  ): Promise<WhatsAppUnfit | null> {
    if (target.via !== HumanChannelViaEnum.WHATSAPP) {
      return null;
    }

    if ((params.buttons ?? 0) > WHATSAPP_MAX_REPLY_BUTTONS) {
      return { reason: WHATSAPP_TOO_MANY_BUTTONS, buttons: params.buttons ?? 0 };
    }

    const integration = integrations.find((candidate) => candidate.identifier === target.integrationIdentifier);
    if (!integration) {
      return { reason: WHATSAPP_WINDOW_CLOSED };
    }

    // A WhatsApp target is connected when its number was proved, and that code message opened a window too.
    const window = await this.whatsAppWindow.describe(params, integration, {
      waId: target.platformUserId,
      provedAt: target.lastCodeAt ?? target.connectedAt,
    });

    return window.open ? null : { reason: WHATSAPP_WINDOW_CLOSED, windowClosedAt: window.closesAt };
  }

  /** The person's channels other than WhatsApp that reach them right now, for a refused WhatsApp send to name. */
  async otherReachableVias(
    params: { environmentId: string; organizationId: string; agentId: string; subscriberId: string },
    integrations?: IntegrationEntity[]
  ): Promise<HumanChannelViaEnum[]> {
    const linked = integrations ?? (await this.findLinkedIntegrations(params));
    const others = linked.filter(
      (integration) => viaForProviderId(integration.providerId) !== HumanChannelViaEnum.WHATSAPP
    );
    const reachable = await this.findReachableTargets(params, others);

    return [...new Set([...reachable].sort(byConnection).map((target) => target.via))];
  }

  /**
   * One send to an address the caller typed. Does not consult `addresses.email.verified`
   * and does not mark the address reachable for later contact-id sends.
   */
  private async resolveExplicitEmail(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    explicitEmail: string;
  }): Promise<ResolvedHumanTarget> {
    if (this.keylessEmailGate.isBlocked(params.organizationId)) {
      await this.keylessEmailGate.assertAllowed(params);
    }

    const email = (await this.findLinkedIntegrations(params)).find(
      (integration) =>
        integration.channel === ChannelTypeEnum.EMAIL &&
        viaForProviderId(integration.providerId) === HumanChannelViaEnum.EMAIL
    );

    if (!email) {
      throw new NotFoundException(
        `No ${HumanChannelViaEnum.EMAIL} channel is linked to this agent. Connect ${HumanChannelViaEnum.EMAIL} or run \`npx @agentinbox/cli channel add ${HumanChannelViaEnum.EMAIL}\`.`
      );
    }

    return {
      platform: HumanChannelViaEnum.EMAIL,
      platformUserId: params.explicitEmail,
      integrationIdentifier: email.identifier,
    };
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

  /**
   * The agent's channels that work, as the dashboard shows them connected: email once the agent has its
   * address, Telegram and Slack once someone linked their chat.
   */
  async listWorkingChannels(params: {
    environmentId: string;
    organizationId: string;
    agent: Pick<AgentEntity, '_id' | 'identifier' | 'name'>;
  }): Promise<HumanChannelViaEnum[]> {
    const integrations = await this.findLinkedIntegrations({ ...params, agentId: params.agent._id });
    const channels = await Promise.all(
      integrations.map(async (integration) => {
        const via = viaForProviderId(integration.providerId);
        if (!via) {
          return null;
        }

        if (via === HumanChannelViaEnum.EMAIL) {
          return resolvePublishedAgentInboxAddress(integration.credentials, params.agent) ? via : null;
        }

        const chat = await this.channelEndpointRepository.findOne(
          {
            _environmentId: params.environmentId,
            _organizationId: params.organizationId,
            integrationIdentifier: integration.identifier,
          },
          '_id'
        );

        return chat ? via : null;
      })
    );

    return [...new Set(channels.filter((via): via is HumanChannelViaEnum => via !== null))];
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
        const described = describeEmailInviteChannel(
          channel,
          describeStoredEmail(contact?.addresses?.[HumanChannelViaEnum.EMAIL]),
          defaultVia
        );

        // Keyless can prove the address, but still cannot send. Keep the stored
        // verification state so setup can see the link was used.
        if (this.keylessEmailGate.isBlocked(params.organizationId)) {
          return {
            ...described,
            connected: false,
            isDefault: false,
            available: false,
          };
        }

        return described;
      }

      const target = targets.find((candidate) => candidate.integrationIdentifier === channel.integrationIdentifier);
      const connected = Boolean(target);

      return {
        ...channel,
        connected,
        available: true,
        isDefault: connected && defaultVia === channel.via,
        status: connected ? HumanAddressVerificationStateEnum.VERIFIED : HumanAddressVerificationStateEnum.UNVERIFIED,
        ...describeContactHandle(channel.via, target?.handle),
      };
    });
  }

  /**
   * Channel status for `human contact list`. Includes a stored email address even
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
    // Keyless orgs cannot send email, so no address counts as reachable here.
    const emailBlocked = this.keylessEmailGate.isBlocked(params.organizationId);
    const verifiedEmails = new Map(
      contacts.flatMap((contact) => {
        const verified = emailBlocked ? undefined : contact.addresses?.[HumanChannelViaEnum.EMAIL]?.verified;
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
        verifiedEmails.get(subscriber.subscriberId)
      );

      result.set(subscriber.subscriberId, {
        targets,
        defaultVia: pickDefaultTarget(targets, savedDefaults.get(subscriber.subscriberId))?.via,
      });
    }

    await this.attachWhatsAppWindows(
      params,
      integrations,
      [...result.values()].flatMap(({ targets }) => targets)
    );

    return result;
  }

  /**
   * Fills in each WhatsApp target's 24-hour window, so a list can say before a send whether WhatsApp can be
   * written to right now. One read per business number, however many people are on it.
   */
  private async attachWhatsAppWindows(
    scope: { environmentId: string; organizationId: string },
    integrations: IntegrationEntity[],
    targets: ReachableHumanTarget[]
  ): Promise<void> {
    const byIntegration = new Map<string, ReachableHumanTarget[]>();
    for (const target of targets) {
      if (target.via === HumanChannelViaEnum.WHATSAPP) {
        byIntegration.set(target.integrationIdentifier, [
          ...(byIntegration.get(target.integrationIdentifier) ?? []),
          target,
        ]);
      }
    }

    for (const [identifier, onIntegration] of byIntegration) {
      const integration = integrations.find((candidate) => candidate.identifier === identifier);
      if (!integration) {
        continue;
      }

      const windows = await this.whatsAppWindow.describeMany(
        scope,
        integration,
        onIntegration.map((target) => ({
          waId: target.platformUserId,
          provedAt: target.lastCodeAt ?? target.connectedAt,
        }))
      );
      for (const target of onIntegration) {
        target.window = windows.get(target.platformUserId);
      }
    }
  }

  /** Same rules as {@link tryResolveTarget}, over rows that were loaded up front. */
  private reachableTargetsOf(
    subscriberId: string,
    integrations: IntegrationEntity[],
    endpoints: ChannelEndpointEntity[],
    verifiedEmail: { address: string; verifiedAt: string } | undefined
  ): ReachableHumanTarget[] {
    const targets: ReachableHumanTarget[] = [];

    for (const integration of integrations) {
      const via = viaForProviderId(integration.providerId);
      if (!via) {
        continue;
      }

      if (integration.channel === ChannelTypeEnum.EMAIL) {
        if (verifiedEmail) {
          targets.push(emailTarget(verifiedEmail.address, via, integration.identifier, verifiedEmail.verifiedAt));
        }

        continue;
      }

      // The first of their endpoints that reaches them: an older one without proof never hides a proved number.
      const target = this.firstTarget(
        endpoints.filter(
          (candidate) =>
            candidate.subscriberId === subscriberId && candidate.integrationIdentifier === integration.identifier
        ),
        via,
        integration.identifier
      );

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
  ): Promise<{ platformMessageId: string; platformThreadId: string; held?: boolean }> {
    if (target.firstMessage) {
      return { ...(await this.sendFirstMessage(interaction, target, target.firstMessage)), held: true };
    }

    return this.deliverContent(interaction._agentId, target, buildPendingDeliveryContent(interaction));
  }

  /**
   * Sends the approved first-message template in place of the message, with the agent's name in it and a button
   * that comes back as this interaction. A failure is a refusal for the closed window, with Meta's reason.
   */
  private async sendFirstMessage(
    interaction: HumanInteractionEntity,
    target: ResolvedHumanTarget,
    firstMessage: { templateName: string }
  ): Promise<{ platformMessageId: string; platformThreadId: string }> {
    const scope = { _environmentId: interaction._environmentId, _organizationId: interaction._organizationId };
    const [integration, agent] = await Promise.all([
      this.integrationRepository.findOne({ ...scope, identifier: target.integrationIdentifier }),
      this.agentRepository.findOne({ ...scope, _id: interaction._agentId }, ['name']),
    ]);
    const credentials = decryptCredentials(integration?.credentials ?? {});
    const subscriberId = interaction.subscriberIds[0] ?? 'this person';
    const refuse = async (failure: string) =>
      new WhatsAppUndeliverableException(
        subscriberId,
        { reason: WHATSAPP_WINDOW_CLOSED, firstMessageFailure: failure },
        await this.otherReachableVias({
          environmentId: interaction._environmentId,
          organizationId: interaction._organizationId,
          agentId: interaction._agentId,
          subscriberId,
        }).catch(() => [])
      );

    if (!credentials.apiToken || !credentials.phoneNumberIdentification) {
      throw await refuse("The first message couldn't go out: connect WhatsApp again on agentinbox.md.");
    }

    // The name agentinbox.md shows for an agent that was never named, so the preview there matches.
    const agentName = agent?.name && agent.name !== HUMAN_RELAY_DEFAULT_NAME ? agent.name : 'Inbox agent';
    const sent = await sendNamedWhatsAppTemplate({
      accessToken: credentials.apiToken,
      phoneNumberId: credentials.phoneNumberIdentification,
      to: target.platformUserId,
      templateName: firstMessage.templateName,
      languageCode: FIRST_MESSAGE_LANGUAGE,
      bodyParameters: { [AGENT_NAME_VARIABLE]: agentName },
      // A tap comes back as this interaction, so it releases what was held for them.
      quickReplyPayloads: [buildHumanOpenActionId(interaction.identifier)],
    });
    const error = extractMetaError(sent.body);
    const messageId = sent.body.messages?.[0]?.id;
    if (error || sent.statusCode >= 400 || !messageId) {
      throw await refuse(describeFirstMessageFailure(error?.code, error?.message));
    }

    return {
      platformMessageId: messageId,
      platformThreadId: `whatsapp:${credentials.phoneNumberIdentification}:${target.platformUserId}`,
    };
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
        `Human "${params.subscriberId}"'s email ${maskEmail(pending.address)} is waiting to be confirmed ` +
        `(sent ${relativeAge(pending.requestedAt)}). Re-run \`human contact invite ${params.subscriberId} --via email\` to resend.`
      );
    }

    return `Human "${params.subscriberId}" has no confirmed email address. Run \`human contact invite ${params.subscriberId} --via email\`.`;
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

    const integrations = await this.integrationRepository.find({
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
      _id: { $in: links.map((link) => link._integrationId) },
    });

    // Every list, invite page and resolution reads through here, so a gated channel is absent everywhere at once.
    return this.channelGate.filterIntegrations(integrations, params);
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

    const endpoints = await this.channelEndpointRepository.find(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        subscriberId: params.subscriberId,
        integrationIdentifier: integration.identifier,
      },
      '',
      { sort: { _id: 1 } }
    );

    return this.firstTarget(endpoints, via, integration.identifier);
  }

  /** The oldest endpoint that reaches the person, skipping any that can't (a WhatsApp number without proof). */
  private firstTarget(
    endpoints: ChannelEndpointEntity[],
    via: HumanChannelViaEnum,
    integrationIdentifier: string
  ): ReachableHumanTarget | null {
    for (const endpoint of endpoints) {
      const target = this.toTarget(endpoint, via, integrationIdentifier);
      if (target) {
        return target;
      }
    }

    return null;
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

    const handle = readContactHandle(endpoint.endpoint);
    const lastCodeAt = endpoint.type === ENDPOINT_TYPES.PHONE ? whatsAppNumberLastCodeAtOf(endpoint) : undefined;

    return {
      via,
      platform: via,
      platformUserId,
      integrationIdentifier,
      // A WhatsApp number connected when it was proved, which can be later than the endpoint when it moved owners.
      connectedAt: (endpoint.type === ENDPOINT_TYPES.PHONE && whatsAppNumberProvedAtOf(endpoint)) || endpoint.createdAt,
      ...(lastCodeAt ? { lastCodeAt } : {}),
      ...(Object.keys(handle).length > 0 ? { handle } : {}),
    };
  }
}

function describeEmailInviteChannel(
  channel: { via: HumanInviteVia; integrationIdentifier: string },
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

  const rawAddress = verified?.address ?? pending?.address ?? slot?.declared?.address;

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
    ...(channel.handle ? { handle: channel.handle } : {}),
    ...(channel.workspace ? { workspace: channel.workspace } : {}),
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
    // Only a number someone proved with a wa.me code: a `phone` endpoint on WhatsApp Business that carries the
    // proof. The channel-endpoints API writes `phone` endpoints too, for SMS and on any integration, and those
    // can't carry it, so they never count as WhatsApp.
    // Addressed by wa_id, the number's digits: that is how WhatsApp names the person, and how the threads of
    // their own messages are keyed, so a DM and their reply land in the same conversation.
    case ENDPOINT_TYPES.PHONE: {
      const phoneNumber = provedWhatsAppNumberOf(endpoint);

      return phoneNumber ? normalizePhoneForMeta(phoneNumber) : undefined;
    }
    default:
      return undefined;
  }
}

/** Meta's reason a first message didn't go out, in words the operator can act on. */
function describeFirstMessageFailure(code: number | undefined, message: string | undefined): string {
  if (code === 131042) {
    return "Meta couldn't send the first message: add a payment method to your WhatsApp Business account.";
  }

  if (code === 132000 || code === 132001 || code === 132005 || code === 132015 || code === 132016) {
    return "Meta couldn't send the first message: it is paused or no longer approved. Check it on agentinbox.md.";
  }

  if (code === 190 || code === 463) {
    return "Meta couldn't send the first message: connect WhatsApp again on agentinbox.md.";
  }

  return `Meta couldn't send the first message${message ? `: ${message}` : ''}.`;
}
