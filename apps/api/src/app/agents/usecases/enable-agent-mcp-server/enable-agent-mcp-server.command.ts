import { McpConnectionScopeEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class EnableAgentMcpServerCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  mcpId: string;

  @IsOptional()
  @IsEnum(McpConnectionScopeEnum)
  defaultScope?: McpConnectionScopeEnum;
}
