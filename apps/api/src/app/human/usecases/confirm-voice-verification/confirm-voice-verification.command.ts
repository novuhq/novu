import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class ConfirmVoiceVerificationCommand extends EnvironmentCommand {
  /** Invite page. The CLI passes `agentIdentifier` instead. */
  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}
