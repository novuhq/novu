import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetTopicCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  topicKey: string;
}
