import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { TopicRepository } from '@novu/dal';
import { VALID_ID_REGEX } from '@novu/shared';
import { TopicResponseDto } from '../../dtos/topic-response.dto';
import { mapTopicEntityToDto } from '../list-topics/map-topic-entity-to.dto';
import { UpsertTopicCommand } from './upsert-topic.command';

@Injectable()
export class UpsertTopicUseCase {
  constructor(private topicRepository: TopicRepository) {}

  @InstrumentUsecase()
  async execute(command: UpsertTopicCommand): Promise<{ topic: TopicResponseDto; created: boolean }> {
    let topic = await this.topicRepository.findTopicByKey(command.key, command.organizationId, command.environmentId);
    if (command.failIfExists && topic) {
      throw new ConflictException(`Topic with key "${command.key}" already exists`);
    }

    if (!topic) {
      this.isValidTopicKey(command.key);

      topic = await this.topicRepository.createTopic({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        key: command.key,
        name: command.name,
      });
    } else {
      const updateBody: Record<string, unknown> = {};

      if (command.name) {
        updateBody.name = command.name;
      }

      topic = await this.topicRepository.findOneAndUpdate(
        {
          _id: topic._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        {
          $set: updateBody,
        }
      );
    }

    return {
      topic: mapTopicEntityToDto(topic!),
      created: !topic,
    };
  }

  private isValidTopicKey(key: string): void {
    if (VALID_ID_REGEX.test(key)) {
      return;
    }

    throw new BadRequestException(
      `Invalid topic key: "${key}". Topic keys must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), underscores (_), colons (:), or be a valid email address.`
    );
  }
}
