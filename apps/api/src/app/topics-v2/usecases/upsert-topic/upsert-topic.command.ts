import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpsertTopicCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsOptional()
  name?: string;
}
