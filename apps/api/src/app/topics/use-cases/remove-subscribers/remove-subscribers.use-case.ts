import { TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';
import { ConflictException, Injectable } from '@nestjs/common';

import { RemoveSubscribersCommand } from './remove-subscribers.command';

import { EnvironmentId, OrganizationId, TopicId } from '../../types';

@Injectable()
export class RemoveSubscribersUseCase {
  constructor(private topicSubscribersRepository: TopicSubscribersRepository) {}

  async execute(command: RemoveSubscribersCommand): Promise<void> {
    await this.topicSubscribersRepository.removeSubscribers(
      command.environmentId,
      command.organizationId,
      command.topicKey,
      command.subscribers
    );

    return undefined;
  }
}
