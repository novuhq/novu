import { TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';
import { ConflictException, Injectable } from '@nestjs/common';

import { AddSubscribersCommand } from './add-subscribers.command';

@Injectable()
export class AddSubscribersUseCase {
  constructor(private topicSubscribersRepository: TopicSubscribersRepository) {}

  async execute(command: AddSubscribersCommand) {
    const entity = this.mapToEntity(command);

    await this.topicSubscribersRepository.addSubscribers(entity);

    return undefined;
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
