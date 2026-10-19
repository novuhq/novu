import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  AgentRepository,
  BaseRepository,
  type HumanContactChannelAddresses,
  HumanContactRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { HumanAddressVerificationStateEnum, HumanChannelViaEnum } from '@novu/shared';
import { DirectionEnum } from '../../../shared/dtos/base-responses';
import { buildHumanDashboardUrl } from '../../../shared/helpers/resolve-human-dashboard-base-url';
import {
  DEFAULT_CONTACTS_LIMIT,
  HumanContactChannelDto,
  HumanContactDto,
  HumanContactEmailDto,
  ListContactsResponseDto,
} from '../../dtos/list-contacts.dto';
import { describeContactHandle } from '../../services/contact-handle';
import { HumanDeliveryService, type ReachableHumanTarget } from '../../services/human-delivery.service';
import { HumanInviteTokenService, type PendingHumanInvite } from '../../services/human-invite-token.service';
import { HumanOperatorService } from '../../services/human-operator.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { ListContactsCommand } from './list-contacts.command';

interface ContactReach {
  targets: ReachableHumanTarget[];
  defaultVia?: HumanChannelViaEnum;
  invite?: PendingHumanInvite;
  /** The email slots stored for this relay: verified, waiting for its link, and typed during setup. */
  storedEmail?: HumanContactChannelAddresses;
}

interface PageReach {
  contacts: Map<string, ContactReach>;
  /** The account owner's contact, when the relay agent has one. */
  operatorId: string | null;
}

/**
 * Lists the environment's subscribers as contacts. Backed by the same
 * repository pagination as `GET /v2/subscribers`, but exposed under
 * `/v1/human` so it is keyless-reachable by the `human` CLI. Each contact
 * also says where the relay agent can reach them, how far their email's
 * double opt-in got, whether they are the operator and whether an invite
 * link is still waiting for them.
 */
@Injectable()
export class ListContacts {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentRepository: AgentRepository,
    private readonly deliveryService: HumanDeliveryService,
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly humanOperator: HumanOperatorService
  ) {}

  @InstrumentUsecase()
  async execute(command: ListContactsCommand): Promise<ListContactsResponseDto> {
    // A cursor that is not an internal id can never match a row; return an
    // empty page instead of letting the repository throw on a bad ObjectId.
    if (command.after && !BaseRepository.isInternalId(command.after)) {
      return { data: [], next: null };
    }

    const page = await this.subscriberRepository.listSubscribers({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      limit: command.limit ?? DEFAULT_CONTACTS_LIMIT,
      after: command.after,
      subscriberId: command.subscriberId,
      sortBy: '_id',
      sortDirection: DirectionEnum.DESC,
    });
    const reach = await this.describeReach(command, page.subscribers);

    return {
      data: page.subscribers.map((subscriber) =>
        toContact(subscriber, reach.contacts.get(subscriber.subscriberId), {
          includeInviteLink: command.includeInviteLinks === true,
          isOperator: subscriber.subscriberId === reach.operatorId,
        })
      ),
      next: page.next,
    };
  }

  /** Before `human setup` there is no relay agent, so nobody is reachable, invited or the operator yet. */
  private async describeReach(command: ListContactsCommand, subscribers: SubscriberEntity[]): Promise<PageReach> {
    const contacts = new Map<string, ContactReach>();

    if (subscribers.length === 0) {
      return { contacts, operatorId: null };
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      return { contacts, operatorId: null };
    }

    const subscriberIds = subscribers.map(({ subscriberId }) => subscriberId);
    const [reachability, invites, stored, operatorId] = await Promise.all([
      this.deliveryService.describeReachabilityForMany({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentId: agent._id,
        subscribers,
      }),
      this.inviteTokens.findPending({
        environmentId: command.environmentId,
        agentId: agent._id,
        subscriberIds,
      }),
      this.humanContactRepository.find(
        { _environmentId: command.environmentId, _agentId: agent._id, subscriberId: { $in: subscriberIds } },
        ['subscriberId', 'addresses']
      ),
      this.humanOperator.findForAgent({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentId: agent._id,
      }),
    ]);
    const storedEmails = new Map(
      stored.map((contact) => [contact.subscriberId, contact.addresses?.[HumanChannelViaEnum.EMAIL]])
    );

    for (const subscriberId of subscriberIds) {
      contacts.set(subscriberId, {
        targets: reachability.get(subscriberId)?.targets ?? [],
        defaultVia: reachability.get(subscriberId)?.defaultVia,
        invite: invites.get(subscriberId),
        storedEmail: storedEmails.get(subscriberId),
      });
    }

    return { contacts, operatorId };
  }
}

function toContact(
  subscriber: SubscriberEntity,
  reach: ContactReach | undefined,
  { includeInviteLink, isOperator }: { includeInviteLink: boolean; isOperator: boolean }
): HumanContactDto {
  const channels = toChannels(reach?.targets ?? [], reach?.defaultVia);
  const emailVerification = toEmailVerification(reach?.storedEmail, subscriber.email);

  return {
    id: subscriber.subscriberId,
    ...(subscriber.firstName ? { firstName: subscriber.firstName } : {}),
    ...(subscriber.lastName ? { lastName: subscriber.lastName } : {}),
    ...(subscriber.email ? { email: subscriber.email } : {}),
    ...(emailVerification ? { emailVerification } : {}),
    ...(subscriber.phone ? { phone: subscriber.phone } : {}),
    ...(subscriber.data ? { data: subscriber.data } : {}),
    channels,
    ...(reach?.defaultVia ? { defaultVia: reach.defaultVia } : {}),
    status: channels.length > 0 ? 'joined' : 'invite_sent',
    isOperator,
    ...(reach?.invite
      ? {
          invite: {
            ...(includeInviteLink ? { url: buildHumanDashboardUrl(`/invite/${reach.invite.token}`) } : {}),
            expiresAt: reach.invite.expiresAt,
          },
        }
      : {}),
    createdAt: subscriber.createdAt,
    updatedAt: subscriber.updatedAt,
  };
}

/** One entry per channel kind, even when the agent has two integrations of the same kind. */
function toChannels(targets: ReachableHumanTarget[], defaultVia?: HumanChannelViaEnum): HumanContactChannelDto[] {
  const channels: HumanContactChannelDto[] = [];

  for (const target of targets) {
    if (channels.some((channel) => channel.via === target.via)) {
      continue;
    }

    channels.push({
      via: target.via,
      ...(target.connectedAt ? { connectedAt: target.connectedAt } : {}),
      ...(target.via === HumanChannelViaEnum.EMAIL ? { address: target.platformUserId } : {}),
      ...describeContactHandle(target.via, target.handle),
      isDefault: target.via === defaultVia,
    });
  }

  return channels;
}

/**
 * The verified address wins; then the one waiting for its link; then one that was only ever typed (setup's
 * `email`) or put on the profile. A pending link for another address than the verified one is the change
 * still to be confirmed.
 */
function toEmailVerification(
  stored: HumanContactChannelAddresses | undefined,
  subscriberEmail: string | undefined
): HumanContactEmailDto | undefined {
  const verified = stored?.verified;
  const pending = stored?.pending && { address: stored.pending.address, requestedAt: stored.pending.requestedAt };

  if (verified) {
    return {
      address: verified.address,
      status: HumanAddressVerificationStateEnum.VERIFIED,
      verifiedAt: verified.verifiedAt,
      ...(pending && pending.address !== verified.address ? { pending } : {}),
    };
  }

  if (pending) {
    return { address: pending.address, status: HumanAddressVerificationStateEnum.PENDING, pending };
  }

  const known = stored?.declared?.address ?? subscriberEmail;

  return known ? { address: known, status: HumanAddressVerificationStateEnum.UNVERIFIED } : undefined;
}
