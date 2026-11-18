import { IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateContactCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  listenTo?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  fullAccess?: boolean;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}
