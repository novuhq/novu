import { TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';
import { SubscriberDto } from '@novu/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { ExternalSubscriberId } from '../../types';

import { AddSubscribersCommand } from './add-subscribers.command';

import { SearchByExternalSubscriberIds, SearchByExternalSubscriberIdsCommand } from '../../../subscribers/usecases';

@Injectable()
export class AddSubscribersUseCase {
  constructor(
    private searchByExternalSubscriberIds: SearchByExternalSubscriberIds,
    private topicSubscribersRepository: TopicSubscribersRepository
  ) {}

  async execute(command: AddSubscribersCommand) {
    const filteredSubscribersCommand = await this.filterExistingSubscribers(command);

    const entity = this.mapToEntity(filteredSubscribersCommand);
    await this.topicSubscribersRepository.addSubscribers(entity);

    return undefined;
  }

  private async filterExistingSubscribers(command: AddSubscribersCommand): Promise<AddSubscribersCommand> {
    const { environmentId, organizationId, subscribers } = command;
    const searchByExternalSubscriberIdsCommand = SearchByExternalSubscriberIdsCommand.create({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      externalSubscriberIds: subscribers,
    });
    const existingSubscribers = await this.searchByExternalSubscriberIds.execute(searchByExternalSubscriberIdsCommand);

    const filteredSubscribers = this.getIntersection(subscribers, existingSubscribers);

    return {
      ...command,
      subscribers: filteredSubscribers,
    };
  }

  /**
   * Time complexity: 0(n)
   */
  private getIntersection(
    externalSubscriberIds: ExternalSubscriberId[],
    existingSubscribers: SubscriberDto[]
  ): ExternalSubscriberId[] {
    const setExternalSubscribers = new Set<ExternalSubscriberId>(externalSubscriberIds);
    const filteredExternalSubscribers = new Set<ExternalSubscriberId>();

    for (const existingSubscriber of existingSubscribers) {
      if (setExternalSubscribers.has(existingSubscriber.subscriberId)) {
        filteredExternalSubscribers.add(existingSubscriber.subscriberId);
      }
    }

    return Array.from(filteredExternalSubscribers);
  }

  private mapToEntity(domainEntity: AddSubscribersCommand): TopicSubscribersEntity {
    return {
      _environmentId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.environmentId),
      _organizationId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.organizationId),
      _topicId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.topicId),
      _userId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.userId),
      subscribers: domainEntity.subscribers,
    };
  }
}
