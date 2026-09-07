import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

    if (command.name === undefined && command.data === undefined) {
      throw new BadRequestException('At least one of name or data must be provided');
    }

    const setBody: Record<string, unknown> = {};
    const unsetBody: Record<string, ''> = {};

    if (command.name !== undefined) {
      setBody.name = command.name;
    }

    if (command.data !== undefined) {
      if (command.data === null) {
        unsetBody.data = '';
      } else {
        setBody.data = command.data;
      }
    }

    const updatedTopic = await this.topicRepository.findOneAndUpdate(
      {
        _id: existingTopic._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      {
        ...(Object.keys(setBody).length > 0 ? { $set: setBody } : {}),
        ...(Object.keys(unsetBody).length > 0 ? { $unset: unsetBody } : {}),
      },
      { new: true }
    );

    return mapTopicEntityToDto(updatedTopic!);
  }
}
