import { IsDefined, IsString } from 'class-validator';

import { TopicId, TopicName } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class RenameTopicCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  id: TopicId;

  @IsString()
  @IsDefined()
  name: TopicName;
}
