import { ArrayUnique, IsArray, IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SetAgentMcpServersCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  mcpIds: string[];
}
