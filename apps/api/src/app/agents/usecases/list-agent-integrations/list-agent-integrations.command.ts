import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class ListAgentIntegrationsCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;
}
