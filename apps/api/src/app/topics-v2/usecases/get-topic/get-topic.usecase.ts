import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { TopicRepository } from '@novu/dal';
import { TopicResponseDto } from '../../dtos/topic-response.dto';
import { mapTopicEntityToDto } from '../list-topics/map-topic-entity-to.dto';
import { GetTopicCommand } from './get-topic.command';

@Injectable()
export class GetTopicUseCase {
  constructor(private topicRepository: TopicRepository) {}

  @InstrumentUsecase()
  async execute(command: GetTopicCommand): Promise<TopicResponseDto> {
    const topic = await this.topicRepository.findTopicByKey(
      command.topicKey,
      command.organizationId,
      command.environmentId
    );

    if (!topic) {
      throw new NotFoundException(`Topic with key ${command.topicKey} not found`);
    }

    return mapTopicEntityToDto(topic);
  }
}
