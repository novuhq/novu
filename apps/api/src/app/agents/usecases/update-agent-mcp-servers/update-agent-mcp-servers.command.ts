import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { AgentMcpServerSelectionDto } from '../../dtos/agent-runtime.dto';
import { MCP_CATALOG_IDS } from '../../runtimes/mcp-catalog';

export class UpdateAgentMcpServersCommand extends EnvironmentWithUserCommand {
  @IsString()
  agentIdentifier: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentMcpServerSelectionDto)
  @ArrayMaxSize(MCP_CATALOG_IDS.length)
  @IsOptional()
  mcpServers?: AgentMcpServerSelectionDto[];
}
