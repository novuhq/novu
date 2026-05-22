import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { McpConnectionAuthModeEnum, McpConnectionScopeEnum, McpConnectionStatusEnum } from '@novu/shared';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EnableAgentMcpServerRequestDto {
  @ApiProperty({ description: 'Catalog id from MCP_SERVERS (e.g. "slack").' })
  @IsNotEmpty()
  @IsString()
  mcpId: string;

  @ApiPropertyOptional({
    // The wider `environment` / `agent` enum members exist on
    // `McpConnectionScopeEnum` for forward compatibility but the v1 enable
    // flow only wires the subscriber-scoped path end-to-end, so the public
    // request surface is restricted to that single value.
    enum: [McpConnectionScopeEnum.Subscriber],
    description:
      'Default authorisation scope for connections under this enabled MCP. Only "subscriber" is accepted today.',
  })
  @IsOptional()
  @IsIn([McpConnectionScopeEnum.Subscriber])
  defaultScope?: McpConnectionScopeEnum.Subscriber;
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
