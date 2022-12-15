import { TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';
import { SubscriberDto } from '@novu/shared';
import { Injectable } from '@nestjs/common';
import { ExternalSubscriberId, TopicId } from '../../types';

import { AddSubscribersCommand } from './add-subscribers.command';

import { SearchByExternalSubscriberIds, SearchByExternalSubscriberIdsCommand } from '../../../subscribers/usecases';

@Injectable()
export class AddSubscribersUseCase {
  constructor(
    private searchByExternalSubscriberIds: SearchByExternalSubscriberIds,
    private topicSubscribersRepository: TopicSubscribersRepository
  ) {}

  async execute(command: AddSubscribersCommand) {
    const filteredSubscribers = await this.filterExistingSubscribers(command);

    if (filteredSubscribers.length > 0) {
      const topicSubscribers = this.mapSubscribersToTopic(command.topicId, filteredSubscribers);
      await this.topicSubscribersRepository.addSubscribers(topicSubscribers);
    }

    return undefined;
  }

  private async filterExistingSubscribers(command: AddSubscribersCommand): Promise<SubscriberDto[]> {
    const { environmentId, organizationId, subscribers } = command;
    const searchByExternalSubscriberIdsCommand = SearchByExternalSubscriberIdsCommand.create({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      externalSubscriberIds: subscribers,
    });
    const existingSubscribers = await this.searchByExternalSubscriberIds.execute(searchByExternalSubscriberIdsCommand);

    return this.getIntersection(subscribers, existingSubscribers);
  }

  /**
   * Time complexity: 0(n)
   */
  private getIntersection(
    externalSubscriberIds: ExternalSubscriberId[],
    existingSubscribers: SubscriberDto[]
  ): SubscriberDto[] {
    const setExternalSubscribers = new Set<ExternalSubscriberId>(externalSubscriberIds);
    const filteredExternalSubscribers = new Set<SubscriberDto>();

    for (const existingSubscriber of existingSubscribers) {
      if (setExternalSubscribers.has(existingSubscriber.subscriberId)) {
        filteredExternalSubscribers.add(existingSubscriber);
      }
    }

    return Array.from(filteredExternalSubscribers);
  }

  private mapSubscribersToTopic(topicId: TopicId, subscribers: SubscriberDto[]): TopicSubscribersEntity[] {
    return subscribers.map((subscriber: SubscriberDto) => ({
      _environmentId: TopicSubscribersRepository.convertStringToObjectId(subscriber._environmentId),
      _organizationId: TopicSubscribersRepository.convertStringToObjectId(subscriber._organizationId),
      _subscriberId: TopicSubscribersRepository.convertStringToObjectId(subscriber._id),
      _topicId: TopicSubscribersRepository.convertStringToObjectId(topicId),
      externalSubscriberId: subscriber.subscriberId,
    }));
  }
}
