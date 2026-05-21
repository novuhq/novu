import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class SyncAgentMcpServersCommand extends EnvironmentCommand {
  @IsNotEmpty()
  @IsString()
  agentId: string;
}
