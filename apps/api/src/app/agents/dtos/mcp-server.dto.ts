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

/**
 * Most-recent failure surface for an MCP connection. Populated when the
 * connection transitions to `error` (e.g. token-exchange failure, user
 * denied consent, GitHub org blocked the app). The dashboard uses
 * `code` to render specific copy and falls back to `message` otherwise.
 *
 * The `code` is intentionally a free string in the DTO (rather than a
 * typed enum) because the underlying union evolves per provider and
 * pinning it to the api-service compile-time set would make adding new
 * mappings a breaking SDK change.
 */
export class McpConnectionLastErrorDto {
  @ApiProperty({
    description:
      'Stable error code (e.g. "mcp_user_denied", "mcp_github_org_block"). See McpOAuthErrorCode for the canonical set.',
  })
  code: string;

  @ApiProperty({ description: 'Sanitized error message (control chars stripped, clamped to 256 chars).' })
  message: string;

  @ApiProperty({ description: 'When the error was recorded (ISO 8601).' })
  at: string;
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

  @ApiPropertyOptional({ type: McpConnectionLastErrorDto })
  lastError?: McpConnectionLastErrorDto;
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
 * One GitHub-App installation the subscriber's token can act on. Returned
 * by `GET /agents/:id/mcp-servers/:mcpId/installations` for catalog
 * entries that opt into the install-and-authorize redirect (currently just
 * `github`).
 *
 * The `manageUrl` deep-links the user back to GitHub's settings page so
 * they can add/remove repos from the installation without re-running the
 * full OAuth dance. Org installs land on the org's settings page; user
 * installs land on the user's installations page.
 */
export class McpInstallationAccountDto {
  @ApiProperty({ description: 'Account login (user handle or org slug).' })
  login: string;

  @ApiProperty({ enum: ['User', 'Organization'] })
  type: 'User' | 'Organization';

  @ApiPropertyOptional({ description: 'CDN avatar URL surfaced by GitHub.' })
  avatarUrl?: string;
}

export class McpInstallationDto {
  @ApiProperty({ description: 'Numeric installation id from GitHub.' })
  id: number;

  @ApiProperty({ type: McpInstallationAccountDto })
  account: McpInstallationAccountDto;

  @ApiProperty({ enum: ['all', 'selected'] })
  repositorySelection: 'all' | 'selected';

  @ApiPropertyOptional({ description: 'Endpoint to list the repositories included in this installation.' })
  repositoriesUrl?: string;

  @ApiProperty({ description: 'Deep link to manage the installation (add/remove repos) on github.com.' })
  manageUrl: string;
}

/**
 * Live installations the subscriber's GitHub-App token can act on. Status
 * field surfaces token-side failures (e.g. `expired`) so the dashboard can
 * prompt re-authorization without inventing a new wire shape.
 */
export class ListMcpInstallationsResponseDto {
  @ApiProperty({ type: [McpInstallationDto] })
  data: McpInstallationDto[];

  @ApiProperty({ enum: McpConnectionStatusEnum })
  connectionStatus: McpConnectionStatusEnum;
}
