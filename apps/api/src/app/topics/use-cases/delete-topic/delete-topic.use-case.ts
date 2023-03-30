import { ConflictException, Injectable } from '@nestjs/common';
import { TopicRepository } from '@novu/dal';

import { DeleteTopicCommand } from './delete-topic.command';

import { GetTopicUseCase } from '../get-topic';

@Injectable()
export class DeleteTopicUseCase {
  constructor(private getTopicUseCase: GetTopicUseCase, private topicRepository: TopicRepository) {}

  async execute(command: DeleteTopicCommand): Promise<void> {
    const topic = await this.getTopicUseCase.execute(command);

    const { subscribers } = topic;

    if (subscribers?.length !== 0) {
      throw new ConflictException(
        `Topic with key ${command.topicKey} in the environment ${command.environmentId} can't be deleted as it still has subscribers assigned`
      );
    }

    await this.topicRepository.deleteTopic(command.topicKey, command.environmentId, command.organizationId);
  }
}
