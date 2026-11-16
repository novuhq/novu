import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ConnectHumanWhatsAppCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  wabaId: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  /** The WhatsApp channel the dashboard made or found. Without it, the relay's active one. */
  @IsOptional()
  @IsString()
  integrationIdentifier?: string;
}
