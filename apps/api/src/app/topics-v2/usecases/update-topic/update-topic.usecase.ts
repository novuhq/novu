import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { TopicRepository } from '@novu/dal';
import { TopicResponseDto } from '../../dtos/topic-response.dto';
import { mapTopicEntityToDto } from '../list-topics/map-topic-entity-to.dto';
import { UpdateTopicCommand } from './update-topic.command';

@Injectable()
export class UpdateTopicUseCase {
  constructor(private topicRepository: TopicRepository) {}

  @InstrumentUsecase()
  async execute(command: UpdateTopicCommand): Promise<TopicResponseDto> {
    const existingTopic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!existingTopic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found`);
    }

    const updatedTopic = await this.topicRepository.findOneAndUpdate(
      {
        _id: existingTopic._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      {
        $set: {
          name: command.name,
        },
      },
      { new: true }
    );

    return mapTopicEntityToDto(updatedTopic!);
  }
}
