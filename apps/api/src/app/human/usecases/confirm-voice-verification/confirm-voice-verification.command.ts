import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { VOICE_VERIFICATION_CODE_PATTERN } from '../../services/human-voice-verification-code.service';

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
  @Matches(VOICE_VERIFICATION_CODE_PATTERN)
  code: string;
}
