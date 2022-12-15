import { TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';
import { ConflictException, Injectable } from '@nestjs/common';

import { RemoveSubscribersCommand } from './remove-subscribers.command';

@Injectable()
export class RemoveSubscribersUseCase {
  constructor(private topicSubscribersRepository: TopicSubscribersRepository) {}

  async execute(command: RemoveSubscribersCommand) {
    const entity = this.mapToEntity(command);

    await this.topicSubscribersRepository.removeSubscribers(entity);

    return undefined;
  }

  private mapToEntity(domainEntity: RemoveSubscribersCommand): TopicSubscribersEntity {
    return {
      _environmentId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.environmentId),
      _organizationId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.organizationId),
      _topicId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.topicId),
      _userId: TopicSubscribersRepository.convertStringToObjectId(domainEntity.userId),
      subscribers: domainEntity.subscribers,
    };
  }
}
