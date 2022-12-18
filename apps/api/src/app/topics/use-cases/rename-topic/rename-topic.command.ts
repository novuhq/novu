import { IsDefined, IsString } from 'class-validator';

import { TopicKey, TopicName } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class RenameTopicCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  topicKey: TopicKey;

  @IsString()
  @IsDefined()
  name: TopicName;
}
