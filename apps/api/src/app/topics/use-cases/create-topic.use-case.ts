import { Injectable } from '@nestjs/common';
import { EnvironmentId, OrganizationId, TopicEntity, TopicKey, TopicRepository, UserId } from '@novu/dal';
import { TopicDto } from '../dtos/topic.dto';
import { CreateTopicCommand } from './create-topic.command';

const mapFromCommandToRepository = (command: CreateTopicCommand) => ({
  _environmentId: command.environmentId as unknown as EnvironmentId,
  _organizationId: command.organizationId as unknown as OrganizationId,
  _userId: command.userId as unknown as UserId,
  key: command.key as TopicKey,
  name: command.name,
});

const mapFromEntityToDto = (topic: TopicEntity): TopicDto => ({
  ...topic,
  _id: topic._id as unknown as string,
  _organizationId: topic._organizationId as unknown as string,
  _environmentId: topic._environmentId as unknown as string,
  _userId: topic._userId as unknown as string,
});

@Injectable()
export class CreateTopicUseCase {
  constructor(private topicRepository: TopicRepository) {}

  async execute(command: CreateTopicCommand) {
    const topic = await this.topicRepository.create(mapFromCommandToRepository(command));

    return mapFromEntityToDto(topic);
  }
}
