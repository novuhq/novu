import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { McpConnectionAuthModeEnum, McpConnectionScopeEnum, McpConnectionStatusEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class EnableAgentMcpServerRequestDto {
  @ApiProperty({ description: 'Catalog id from MCP_SERVERS (e.g. "slack").' })
  @IsNotEmpty()
  @IsString()
  mcpId: string;

  @ApiPropertyOptional({
    enum: McpConnectionScopeEnum,
    description:
      'Default authorisation scope for connections under this enabled MCP. Defaults to "agent_mcp_subscriber".',
  })
  @IsOptional()
  @IsEnum(McpConnectionScopeEnum)
  defaultScope?: McpConnectionScopeEnum;

  @ApiPropertyOptional({
    enum: McpConnectionAuthModeEnum,
    description:
      'Default auth mode for connections under this enabled MCP. Inferred from the catalog OAuth descriptor when omitted.',
  })
  @IsOptional()
  @IsEnum(McpConnectionAuthModeEnum)
  defaultAuthMode?: McpConnectionAuthModeEnum;
}

export class AgentMcpServerEnablementResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Catalog id from MCP_SERVERS.' })
  mcpId: string;

  @ApiProperty()
  enabled: boolean;

  @ApiProperty({ enum: McpConnectionScopeEnum })
  defaultScope: McpConnectionScopeEnum;

  @ApiProperty({ enum: McpConnectionAuthModeEnum })
  defaultAuthMode: McpConnectionAuthModeEnum;

  @ApiProperty({ enum: ['active', 'syncing', 'error', 'disabled'] })
  status: 'active' | 'syncing' | 'error' | 'disabled';
}

export class ListAgentMcpServersResponseDto {
  @ApiProperty({ type: [AgentMcpServerEnablementResponseDto] })
  data: AgentMcpServerEnablementResponseDto[];
}

export class McpConnectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  mcpId: string;

  @ApiProperty({ enum: McpConnectionScopeEnum })
  scope: McpConnectionScopeEnum;

  @ApiProperty({ enum: McpConnectionAuthModeEnum })
  authMode: McpConnectionAuthModeEnum;

  @ApiProperty({ enum: McpConnectionStatusEnum })
  status: McpConnectionStatusEnum;

  @ApiPropertyOptional()
  agentMcpServerId?: string;

  @ApiPropertyOptional()
  subscriberId?: string;

  @ApiPropertyOptional()
  expiresAt?: string;

  @ApiPropertyOptional()
  connectedAt?: string;
}

export class GenerateMcpOAuthUrlRequestDto {
  @ApiProperty({ description: 'External subscriberId of the user authorising the MCP.' })
  @IsNotEmpty()
  @IsString()
  subscriberId: string;
}

export class GenerateMcpOAuthUrlResponseDto {
  @ApiProperty({ description: 'Fully-qualified URL the dashboard should redirect the user to.' })
  authorizeUrl: string;
}

/**
 * Body for `POST /v1/agents/:identifier/mcp-servers/:mcpId/pending-turn` —
 * worker calls this after a managed-agent turn fails due to an upstream MCP
 * initialisation error, so the OAuth callback can re-enqueue the original
 * message once the subscriber finishes authorising.
 *
 * `jobData` is the same `IManagedAgentJobData` shape produced by
 * `ManagedExecutorService` (kept loose at the API boundary so the API doesn't
 * need to import a queue-layer DTO into its OpenAPI schema).
 */
export class ParkManagedAgentTurnRequestDto {
  @ApiProperty({ description: 'External subscriberId whose pending turn should be parked.' })
  @IsNotEmpty()
  @IsString()
  subscriberId: string;

  @ApiProperty({
    description: 'Managed-agent queue payload to replay after OAuth completes.',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  jobData: Record<string, unknown>;
}
