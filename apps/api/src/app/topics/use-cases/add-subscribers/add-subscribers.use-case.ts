import { TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';
import { SubscriberDto } from '@novu/shared';
import { Injectable } from '@nestjs/common';
import { ExternalSubscriberId, TopicId } from '../../types';

import { AddSubscribersCommand } from './add-subscribers.command';

import { SearchByExternalSubscriberIds, SearchByExternalSubscriberIdsCommand } from '../../../subscribers/usecases';

interface ISubscriberGroups {
  existingExternalSubscribers: ExternalSubscriberId[];
  nonExistingExternalSubscribers: ExternalSubscriberId[];
  subscribersAvailableToAdd: SubscriberDto[];
}

@Injectable()
export class AddSubscribersUseCase {
  constructor(
    private searchByExternalSubscriberIds: SearchByExternalSubscriberIds,
    private topicSubscribersRepository: TopicSubscribersRepository
  ) {}

  async execute(command: AddSubscribersCommand): Promise<Omit<ISubscriberGroups, 'subscribersAvailableToAdd'>> {
    const { existingExternalSubscribers, nonExistingExternalSubscribers, subscribersAvailableToAdd } =
      await this.filterExistingSubscribers(command);

    if (subscribersAvailableToAdd.length > 0) {
      const topicSubscribers = this.mapSubscribersToTopic(command.topicId, subscribersAvailableToAdd);
      await this.topicSubscribersRepository.addSubscribers(topicSubscribers);
    }

    return {
      existingExternalSubscribers,
      nonExistingExternalSubscribers,
    };
  }

  private async filterExistingSubscribers(command: AddSubscribersCommand): Promise<ISubscriberGroups> {
    const { environmentId, organizationId, subscribers } = command;

    const searchByExternalSubscriberIdsCommand = SearchByExternalSubscriberIdsCommand.create({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      externalSubscriberIds: subscribers,
    });
    const foundSubscribers = await this.searchByExternalSubscriberIds.execute(searchByExternalSubscriberIdsCommand);

    return this.groupSubscribersIfBelonging(subscribers, foundSubscribers);
  }

  /**
   * Time complexity: 0(n)
   */
  private groupSubscribersIfBelonging(
    subscribers: ExternalSubscriberId[],
    foundSubscribers: SubscriberDto[]
  ): ISubscriberGroups {
    const subscribersList = new Set<ExternalSubscriberId>(subscribers);
    const subscribersAvailableToAdd = new Set<SubscriberDto>();
    const existingExternalSubscribersList = new Set<ExternalSubscriberId>();

    for (const foundSubscriber of foundSubscribers) {
      existingExternalSubscribersList.add(foundSubscriber.subscriberId);
      subscribersList.delete(foundSubscriber.subscriberId);
      subscribersAvailableToAdd.add(foundSubscriber);
    }

    return {
      existingExternalSubscribers: Array.from(existingExternalSubscribersList),
      nonExistingExternalSubscribers: Array.from(subscribersList),
      subscribersAvailableToAdd: Array.from(subscribersAvailableToAdd),
    };
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
