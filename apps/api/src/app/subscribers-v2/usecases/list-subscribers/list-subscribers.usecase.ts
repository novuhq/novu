import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { SubscriberRepository } from '@novu/dal';
import { ListSubscribersCommand } from './list-subscribers.command';
import { ListSubscribersResponseDto } from '../../dtos/list-subscribers-response.dto';
import { DirectionEnum } from '../../../shared/dtos/base-responses';
import { mapSubscriberEntityToDto } from './map-subscriber-entity-to.dto';

@Injectable()
export class ListSubscribersUseCase {
  constructor(private subscriberRepository: SubscriberRepository) {}

  @InstrumentUsecase()
  async execute(command: ListSubscribersCommand): Promise<ListSubscribersResponseDto> {
    const pagination = await this.subscriberRepository.listSubscribers({
      after: command.after,
      before: command.before,
      limit: command.limit,
      sortDirection: command.orderDirection || DirectionEnum.DESC,
      sortBy: command.orderBy,
      email: command.email,
      name: command.name,
      phone: command.phone,
      subscriberId: command.subscriberId,
      environmentId: command.user.environmentId,
      organizationId: command.user.organizationId,
    });

    return {
      data: pagination.subscribers.map((subscriber) => mapSubscriberEntityToDto(subscriber)),
      next: pagination.next,
      previous: pagination.previous,
    };
  }
}
