import { IsDefined, IsString } from 'class-validator';

import { TopicKey, TopicName } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateTopicCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  key: TopicKey;

  @IsString()
  @IsDefined()
  name: TopicName;
}
