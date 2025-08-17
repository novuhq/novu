import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { TopicKey, TopicName } from '../../types';

export class RenameTopicCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  topicKey: TopicKey;

  @IsString()
  @IsDefined()
  name: TopicName;
}
