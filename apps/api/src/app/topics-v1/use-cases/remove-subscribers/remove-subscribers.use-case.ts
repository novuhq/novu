import { ConflictException, Injectable } from '@nestjs/common';
import { TopicSubscribersEntity, TopicSubscribersRepository } from '@novu/dal';
import { EnvironmentId, OrganizationId, TopicId } from '../../types';
import { RemoveSubscribersCommand } from './remove-subscribers.command';

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
