import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateTopicCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  topicKey: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}
