import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

/**
 * CLI path provisions the relay (`userId` required there). The invite page
 * passes `agentId` from the invite token and skips setup.
 */
export class RequestVoiceVerificationCommand extends EnvironmentCommand {
  @IsOptional()
  @IsString()
  userId?: string;

  /** Set by the invite page. When present, setup is skipped. */
  @IsOptional()
  @IsString()
  agentId?: string;

  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}
