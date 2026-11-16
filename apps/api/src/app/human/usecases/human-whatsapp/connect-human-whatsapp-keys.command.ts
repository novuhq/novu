import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ConnectHumanWhatsAppKeysCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsNotEmpty()
  businessAccountId: string;

  @IsString()
  @IsNotEmpty()
  appSecret: string;

  /** The WhatsApp channel the dashboard made or found. Without it, the relay's active one. */
  @IsOptional()
  @IsString()
  integrationIdentifier?: string;
}
