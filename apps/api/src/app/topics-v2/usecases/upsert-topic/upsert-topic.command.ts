import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpsertTopicCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  key: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  name?: string;

  @IsBoolean()
  @IsOptional()
  failIfExists?: boolean;
}
