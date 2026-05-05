import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { MCP_CATALOG_IDS } from '../runtimes/mcp-catalog';
import { AgentMcpServerSelectionDto } from './agent-runtime.dto';

export class UpdateAgentMcpServersRequestDto {
  @ApiPropertyOptional({
    type: [AgentMcpServerSelectionDto],
    description: 'Replacement MCP server list. Pass an empty array to detach all MCP servers.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentMcpServerSelectionDto)
  @ArrayMaxSize(MCP_CATALOG_IDS.length)
  @IsOptional()
  mcpServers?: AgentMcpServerSelectionDto[];
}
