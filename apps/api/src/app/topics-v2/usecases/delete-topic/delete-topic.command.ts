import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteTopicCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  topicKey: string;

  @IsBoolean()
  @IsOptional()
  force?: boolean;
}
