import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class RemoveVoiceAddressCommand extends EnvironmentCommand {
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
}
