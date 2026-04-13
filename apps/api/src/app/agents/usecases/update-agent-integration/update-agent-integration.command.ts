import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateAgentIntegrationCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  agentIntegrationId: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;
}
