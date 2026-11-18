import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateContactCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsOptional()
  @IsBoolean()
  listenTo?: boolean;

  @IsOptional()
  @IsBoolean()
  fullAccess?: boolean;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;
}
