import { IsArray, IsDefined, IsString } from 'class-validator';

import { TopicId, SubscriberId } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class AddSubscribersCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  topicId: TopicId;

  @IsArray()
  @IsDefined()
  subscribers: SubscriberId[];
}
