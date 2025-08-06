import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { TopicKey } from '../../types';

export class DeleteTopicCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  topicKey: TopicKey;
}
