import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { McpConnectionAuthModeEnum, McpConnectionScopeEnum, McpConnectionStatusEnum } from '@novu/shared';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
 * Hard cap on the desired-state payload to keep the bulk endpoint bounded
 * (one Mongo round trip per row + one upstream sync). Product limit: agents
 * are not expected to enable more than 100 MCPs at once.
 */
const MCP_SET_MAX_IDS = 100;

export class SetAgentMcpServersRequestDto {
  @ApiProperty({
    type: [String],
    description:
      'Desired set of enabled MCP catalog ids. Replaces the current enablement set: ' +
      'ids not present are disabled, new ids are enabled, the rest are left untouched. ' +
      'Each entry must match an id from MCP_SERVERS (e.g. "notion", "github", "linear").',
    maxItems: MCP_SET_MAX_IDS,
  })
  @IsArray()
  @ArrayMaxSize(MCP_SET_MAX_IDS)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  mcpIds: string[];
}

/**
 * One entry per id whose mutation failed. The bulk endpoint applies the
 * remaining changes before returning so partial successes are persisted —
 * the caller refetches the list to see the final state and surfaces these
 * failures to the user.
 */
export class SetAgentMcpServersFailureDto {
  @ApiProperty({ description: 'Catalog id from MCP_SERVERS that failed to mutate.' })
  mcpId: string;

  @ApiProperty({ enum: ['enable', 'disable'], description: 'Direction of the mutation that failed.' })
  operation: 'enable' | 'disable';

  @ApiProperty({ description: 'Stable error code (e.g. "mcp_novu_app_disabled", "sync_error").' })
  code: string;

  @ApiProperty({ description: 'Human-readable failure reason.' })
  message: string;
}

export class SetAgentMcpServersResponseDto {
  @ApiProperty({
    type: [AgentMcpServerEnablementResponseDto],
    description: 'Full enabled set after the bulk update.',
  })
  data: AgentMcpServerEnablementResponseDto[];

  @ApiProperty({
    type: [SetAgentMcpServersFailureDto],
    description: 'Per-id failures. Empty when the whole bulk update succeeded.',
  })
  failed: SetAgentMcpServersFailureDto[];
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

  @ApiPropertyOptional({ description: 'Conversation that initiated managed-agent setup (for auto-replay).' })
  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class GenerateMcpOAuthUrlResponseDto {
  @ApiProperty({ description: 'Fully-qualified URL the dashboard should redirect the user to.' })
  authorizeUrl: string;
}

/**
 * Response from the provider-managed vault ensure endpoint. Used by the
 * dashboard's "Add from Claude" flow: after the backend ensures the
 * subscriber vault container exists, the dashboard opens `vaultUrl` in a new
 * tab so the user can complete connector OAuth inside the provider (Claude).
 */
export class EnsureProviderManagedVaultResponseDto {
  @ApiProperty({
    description:
      'Deep link to the managed agent runtime provider\u2019s vault UI. Open in a new tab so the user can finish ' +
      'connector OAuth inside the provider.',
  })
  vaultUrl: string;

  @ApiProperty({
    description: 'Provider-side vault container id Novu provisioned for the current subscriber + agent.',
  })
  externalVaultId: string;
}
