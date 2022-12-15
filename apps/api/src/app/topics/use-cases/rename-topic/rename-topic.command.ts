import { IsDefined, IsString } from 'class-validator';

import { TopicId, TopicName } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class RenameTopicCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  id: TopicId;

  @IsString()
  @IsDefined()
  name: TopicName;
}
