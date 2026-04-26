import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class AddAgentIntegrationCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsOptional()
  integrationIdentifier?: string;

  @IsString()
  @IsOptional()
  providerId?: string;
}
