import { IsDefined, IsString } from 'class-validator';

import { TopicKey, TopicName } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class CreateTopicCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  key: TopicKey;

  @IsString()
  @IsDefined()
  name: TopicName;
}
