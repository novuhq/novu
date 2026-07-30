import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ErrorCodesEnum, TopicRepository } from '@novu/dal';
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

    let created = !topic;

    if (!topic) {
      this.isValidTopicKey(command.key);

      try {
        topic = await this.topicRepository.createTopic({
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
          key: command.key,
          name: command.name,
          data: command.data ?? undefined,
        });
      } catch (error: unknown) {
        if (this.isDuplicateKeyError(error)) {
          topic = await this.topicRepository.findTopicByKey(command.key, command.organizationId, command.environmentId);
          created = false;
        } else {
          throw error;
        }
      }
    } else {
      topic = await this.applyTopicUpdate(topic._id, command);
    }

    return {
      topic: mapTopicEntityToDto(topic!),
      created,
    };
  }

  private async applyTopicUpdate(topicId: string, command: UpsertTopicCommand) {
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

    if (Object.keys(setBody).length === 0 && Object.keys(unsetBody).length === 0) {
      return this.topicRepository.findTopicByKey(command.key, command.organizationId, command.environmentId);
    }

    return await this.topicRepository.findOneAndUpdate(
      {
        _id: topicId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      {
        ...(Object.keys(setBody).length > 0 ? { $set: setBody } : {}),
        ...(Object.keys(unsetBody).length > 0 ? { $unset: unsetBody } : {}),
      },
      { new: true }
    );
  }

  private isValidTopicKey(key: string): void {
    if (VALID_ID_REGEX.test(key)) {
      return;
    }

    throw new BadRequestException(
      `Invalid topic key: "${key}". Topic keys must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), underscores (_), colons (:), or be a valid email address.`
    );
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' && error !== null && 'code' in error && error.code === ErrorCodesEnum.DUPLICATE_KEY
    );
  }
}
