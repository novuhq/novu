import { IsArray, IsDefined, IsString } from 'class-validator';

import { TopicId, ExternalSubscriberId } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class RemoveSubscribersCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  topicId: TopicId;

  @IsArray()
  @IsDefined()
  subscribers: ExternalSubscriberId[];
}
