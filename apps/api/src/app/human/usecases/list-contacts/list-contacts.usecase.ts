import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentRepository, BaseRepository, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { DirectionEnum } from '../../../shared/dtos/base-responses';
import { buildHumanWebsiteUrl } from '../../../shared/helpers/resolve-human-website-base-url';
import {
  DEFAULT_CONTACTS_LIMIT,
  HumanContactChannelDto,
  HumanContactDto,
  ListContactsResponseDto,
} from '../../dtos/list-contacts.dto';
import { HumanDeliveryService, type ReachableHumanTarget } from '../../services/human-delivery.service';
import { HumanInviteTokenService, type PendingHumanInvite } from '../../services/human-invite-token.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { ListContactsCommand } from './list-contacts.command';

interface ContactReach {
  targets: ReachableHumanTarget[];
  defaultVia?: HumanChannelViaEnum;
  invite?: PendingHumanInvite;
}

/**
 * Lists the environment's subscribers as contacts. Backed by the same
 * repository pagination as `GET /v2/subscribers`, but exposed under
 * `/v1/human` so it is keyless-reachable by the `human` CLI. Each contact
 * also says where the relay agent can reach them and whether an invite link
 * is still waiting for them.
 */
@Injectable()
export class ListContacts {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentRepository: AgentRepository,
    private readonly deliveryService: HumanDeliveryService,
    private readonly inviteTokens: HumanInviteTokenService
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
      sortBy: '_id',
      sortDirection: DirectionEnum.DESC,
    });
    const reach = await this.describeReach(command, page.subscribers);

    return {
      data: page.subscribers.map((subscriber) =>
        toContact(subscriber, reach.get(subscriber.subscriberId), command.includeInviteLinks === true)
      ),
      next: page.next,
    };
  }

  /** Before `human setup` there is no relay agent, so nobody is reachable or invited yet. */
  private async describeReach(
    command: ListContactsCommand,
    subscribers: SubscriberEntity[]
  ): Promise<Map<string, ContactReach>> {
    const reach = new Map<string, ContactReach>();

    if (subscribers.length === 0) {
      return reach;
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
      return reach;
    }

    const [reachability, invites] = await Promise.all([
      this.deliveryService.describeReachabilityForMany({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentId: agent._id,
        subscribers,
      }),
      this.inviteTokens.findPending({
        environmentId: command.environmentId,
        agentId: agent._id,
        subscriberIds: subscribers.map(({ subscriberId }) => subscriberId),
      }),
    ]);

    for (const { subscriberId } of subscribers) {
      reach.set(subscriberId, {
        targets: reachability.get(subscriberId)?.targets ?? [],
        defaultVia: reachability.get(subscriberId)?.defaultVia,
        invite: invites.get(subscriberId),
      });
    }

    return reach;
  }
}

function toContact(
  subscriber: SubscriberEntity,
  reach: ContactReach | undefined,
  includeInviteLink: boolean
): HumanContactDto {
  const channels = toChannels(reach?.targets ?? [], reach?.defaultVia);

  return {
    id: subscriber.subscriberId,
    ...(subscriber.firstName ? { firstName: subscriber.firstName } : {}),
    ...(subscriber.lastName ? { lastName: subscriber.lastName } : {}),
    ...(subscriber.email ? { email: subscriber.email } : {}),
    ...(subscriber.phone ? { phone: subscriber.phone } : {}),
    ...(subscriber.data ? { data: subscriber.data } : {}),
    channels,
    ...(reach?.defaultVia ? { defaultVia: reach.defaultVia } : {}),
    status: channels.length > 0 ? 'joined' : 'invite_sent',
    ...(reach?.invite
      ? {
          invite: {
            ...(includeInviteLink ? { url: buildHumanWebsiteUrl(`/invite/${reach.invite.token}`) } : {}),
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

    const handle = handleOf(target);

    channels.push({
      via: target.via,
      ...(handle ? { handle } : {}),
      ...(target.connectedAt ? { connectedAt: target.connectedAt } : {}),
      isDefault: target.via === defaultVia,
    });
  }

  return channels;
}

/**
 * The email address, or the `@username` Telegram reported when the contact connected. A chat's
 * internal id is never a handle, so a contact without a username has none.
 */
function handleOf(target: ReachableHumanTarget): string | undefined {
  if (target.via === HumanChannelViaEnum.EMAIL) {
    return target.platformUserId;
  }

  if (target.via === HumanChannelViaEnum.TELEGRAM && target.displayName) {
    return `@${target.displayName}`;
  }

  return undefined;
}
