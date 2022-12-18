import { TopicSubscribersEntity, TopicSubscribersRepository, TopicEntity, TopicRepository } from '@novu/dal';
import { SubscriberDto } from '@novu/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ExternalSubscriberId } from '../../types';

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
    private topicSubscribersRepository: TopicSubscribersRepository,
    private topicRepository: TopicRepository
  ) {}

  async execute(command: AddSubscribersCommand): Promise<Omit<ISubscriberGroups, 'subscribersAvailableToAdd'>> {
    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      TopicRepository.convertStringToObjectId(command.organizationId),
      TopicRepository.convertStringToObjectId(command.environmentId)
    );
    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found in current environment`);
    }

    const { existingExternalSubscribers, nonExistingExternalSubscribers, subscribersAvailableToAdd } =
      await this.filterExistingSubscribers(command);

    if (subscribersAvailableToAdd.length > 0) {
      const topicSubscribers = this.mapSubscribersToTopic(topic, subscribersAvailableToAdd);
      await this.topicSubscribersRepository.addSubscribers(topicSubscribers);
    }

    return {
      existingExternalSubscribers,
      nonExistingExternalSubscribers,
    };
  }

  private async filterExistingSubscribers(command: AddSubscribersCommand): Promise<ISubscriberGroups> {
    const searchByExternalSubscriberIdsCommand = SearchByExternalSubscriberIdsCommand.create({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      externalSubscriberIds: command.subscribers,
    });
    const foundSubscribers = await this.searchByExternalSubscriberIds.execute(searchByExternalSubscriberIdsCommand);

    return this.groupSubscribersIfBelonging(command.subscribers, foundSubscribers);
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

  private mapSubscribersToTopic(topic: TopicEntity, subscribers: SubscriberDto[]): TopicSubscribersEntity[] {
    return subscribers.map((subscriber: SubscriberDto) => ({
      _environmentId: TopicSubscribersRepository.convertStringToObjectId(subscriber._environmentId),
      _organizationId: TopicSubscribersRepository.convertStringToObjectId(subscriber._organizationId),
      _subscriberId: TopicSubscribersRepository.convertStringToObjectId(subscriber._id),
      _topicId: topic._id,
      topicKey: topic.key,
      externalSubscriberId: subscriber.subscriberId,
    }));
  }
}
