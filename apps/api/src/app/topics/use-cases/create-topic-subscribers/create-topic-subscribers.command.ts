import { IsDefined, IsString } from 'class-validator';

import { TopicId } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateTopicSubscribersCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  topicId: TopicId;
}
