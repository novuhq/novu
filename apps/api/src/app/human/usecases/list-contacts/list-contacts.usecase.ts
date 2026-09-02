import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { BaseRepository, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { DirectionEnum } from '../../../shared/dtos/base-responses';
import { DEFAULT_CONTACTS_LIMIT, HumanContactDto, ListContactsResponseDto } from '../../dtos/list-contacts.dto';
import { ListContactsCommand } from './list-contacts.command';

/**
 * Lists the environment's subscribers as contacts. Backed by the same
 * repository pagination as `GET /v2/subscribers`, but exposed under
 * `/v1/human` so it is keyless-reachable by the `human` CLI and can grow
 * human-specific filters (and a per-contact `channels` field) later.
 */
@Injectable()
export class ListContacts {
  constructor(private readonly subscriberRepository: SubscriberRepository) {}

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

    return {
      data: page.subscribers.map(toContact),
      next: page.next,
    };
  }
}

function toContact(subscriber: SubscriberEntity): HumanContactDto {
  return {
    subscriberId: subscriber.subscriberId,
    ...(subscriber.firstName ? { firstName: subscriber.firstName } : {}),
    ...(subscriber.lastName ? { lastName: subscriber.lastName } : {}),
    ...(subscriber.email ? { email: subscriber.email } : {}),
    ...(subscriber.phone ? { phone: subscriber.phone } : {}),
    ...(subscriber.data ? { data: subscriber.data } : {}),
    createdAt: subscriber.createdAt,
    updatedAt: subscriber.updatedAt,
  };
}
