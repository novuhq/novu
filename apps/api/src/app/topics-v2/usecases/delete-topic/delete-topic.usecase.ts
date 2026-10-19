import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { TopicRepository, TopicSubscribersRepository } from '@novu/dal';
import { DeleteTopicCommand } from './delete-topic.command';

@Injectable()
export class DeleteTopicUseCase {
  constructor(
    private topicRepository: TopicRepository,
    private topicSubscribersRepository: TopicSubscribersRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: DeleteTopicCommand): Promise<void> {
    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found`);
    }

    const hasSubscribers = await this.topicSubscribersRepository.find(
      {
        _topicId: topic._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '_id',
      {
        limit: 1,
      }
    );

    if (hasSubscribers.length > 0 && !command.force) {
      throw new BadRequestException(
        `Topic has subscribers. Use force=true parameter to delete the topic and its subscriptions.`
      );
    }

    if (hasSubscribers.length > 0) {
      await this.topicSubscribersRepository.delete({
        _topicId: topic._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      });
    }

    await this.topicRepository.delete({
      _id: topic._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
