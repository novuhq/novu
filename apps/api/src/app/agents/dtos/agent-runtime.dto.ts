import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentRuntimeEnum } from '@novu/dal';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MCP_CATALOG_IDS, type McpCatalogId } from '../runtimes/mcp-catalog';

export const ANTHROPIC_API_KEY_ENV_VAR = 'NOVU_AGENT_ANTHROPIC_API_KEY' as const;
export const ANTHROPIC_ORG_VAULT_ID_ENV_VAR = 'NOVU_AGENT_ANTHROPIC_ORG_VAULT_ID' as const;

const ANTHROPIC_AGENT_ID_REGEX = /^agent_[a-zA-Z0-9]+$/;
const ANTHROPIC_ENVIRONMENT_ID_REGEX = /^env_[a-zA-Z0-9]+$/;
const ANTHROPIC_VAULT_ID_REGEX = /^vlt_[a-zA-Z0-9]+$/;

export const AGENT_TOOL_NAMES = ['bash', 'edit', 'read', 'write', 'glob', 'grep', 'web_fetch', 'web_search'] as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

export const MANAGED_RUNTIME_SETUP_MODES = ['create', 'existing'] as const;

export type ManagedRuntimeSetupMode = (typeof MANAGED_RUNTIME_SETUP_MODES)[number];

export class AgentToolToggleDto {
  @ApiProperty({ enum: AGENT_TOOL_NAMES })
  @IsIn(AGENT_TOOL_NAMES as unknown as string[])
  name: AgentToolName;

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}

const MCP_AUTH_TYPES = ['oauth', 'static_bearer', 'none'] as const;
const MCP_SCOPES = ['shared', 'per_subscriber'] as const;

/**
 * Request shape for picking an MCP server from the curated catalog. The server
 * hydrates the rest (URL, auth type, scope) from the catalog at persistence time.
 */
export class AgentMcpServerSelectionDto {
  @ApiProperty({ enum: MCP_CATALOG_IDS, description: 'Catalog id of the MCP server to attach.' })
  @IsString()
  @IsIn(MCP_CATALOG_IDS as unknown as string[])
  id: McpCatalogId;
}

/** Hydrated catalog entry — what the agent stores and the API returns. */
export class AgentMcpServerDto {
  @ApiProperty({ description: 'Catalog id (github, linear, notion, ...).' })
  name: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  url: string;

  @ApiProperty({ enum: MCP_AUTH_TYPES })
  authType: 'oauth' | 'static_bearer' | 'none';

  @ApiProperty({ enum: MCP_SCOPES })
  scope: 'shared' | 'per_subscriber';

  @ApiPropertyOptional()
  oauthProvider?: string;
}

/** Catalog entry shape returned by GET /agents/mcp/catalog. */
export class McpCatalogEntryDto extends AgentMcpServerDto {
  @ApiProperty({ enum: MCP_CATALOG_IDS })
  declare name: McpCatalogId;

  @ApiProperty()
  description: string;
}

export class ListMcpCatalogResponseDto {
  @ApiProperty({ type: [McpCatalogEntryDto] })
  data: McpCatalogEntryDto[];
}

export class SharedMcpCredentialStatusDto {
  @ApiProperty({ enum: MCP_CATALOG_IDS })
  mcpServerName: McpCatalogId;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  configured: boolean;
}

export class ListSharedMcpCredentialsResponseDto {
  @ApiProperty({ type: [SharedMcpCredentialStatusDto] })
  data: SharedMcpCredentialStatusDto[];
}

export class SetSharedMcpCredentialRequestDto {
  @ApiProperty({ enum: MCP_CATALOG_IDS, description: 'Catalog id of the shared MCP server.' })
  @IsString()
  @IsIn(MCP_CATALOG_IDS as unknown as string[])
  mcpServerName: McpCatalogId;

  @ApiProperty({ description: 'Static bearer token used to authenticate to the MCP server.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8192)
  token: string;
}

export class SetSharedMcpCredentialResponseDto {
  @ApiProperty()
  configured: boolean;
}

/**
 * Discriminated DTO describing how to wire up the Claude Managed runtime for a new agent.
 *
 * - `mode: 'create'` provisions a brand new Anthropic agent (and a shared environment if missing)
 *   on behalf of the caller. Requires `system` and either an `apiKey` here or a previously stored key.
 * - `mode: 'existing'` references already-provisioned Anthropic resources. This is the legacy shape.
 */
export class ManagedRuntimeSetupDto {
  @ApiProperty({ enum: MANAGED_RUNTIME_SETUP_MODES, default: 'create' })
  @IsIn(MANAGED_RUNTIME_SETUP_MODES as unknown as string[])
  mode: ManagedRuntimeSetupMode;

  @ApiPropertyOptional({ description: 'Anthropic API key. Optional if already saved on the env.' })
  @ValidateIf((o: ManagedRuntimeSetupDto) => o.mode === 'create')
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'System prompt for the new Anthropic agent.' })
  @ValidateIf((o: ManagedRuntimeSetupDto) => o.mode === 'create')
  @IsString()
  @IsNotEmpty()
  @MaxLength(100_000)
  system?: string;

  @ApiPropertyOptional({ type: [AgentToolToggleDto], description: 'Per-tool overrides for the Anthropic toolset.' })
  @ValidateIf((o: ManagedRuntimeSetupDto) => o.mode === 'create')
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentToolToggleDto)
  @ArrayMaxSize(AGENT_TOOL_NAMES.length)
  tools?: AgentToolToggleDto[];

  @ApiPropertyOptional({
    type: [AgentMcpServerSelectionDto],
    description: 'MCP servers to attach. Pick by catalog id; the rest is hydrated server-side.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentMcpServerSelectionDto)
  @ArrayMaxSize(MCP_CATALOG_IDS.length)
  mcpServers?: AgentMcpServerSelectionDto[];

  @ApiPropertyOptional({ enum: ['anthropic'] })
  @ValidateIf((o: ManagedRuntimeSetupDto) => o.mode === 'existing')
  @IsIn(['anthropic'])
  provider?: 'anthropic';

  @ApiPropertyOptional({ description: 'Anthropic Managed Agent id, e.g. agent_011...' })
  @ValidateIf((o: ManagedRuntimeSetupDto) => o.mode === 'existing')
  @IsString()
  @Matches(ANTHROPIC_AGENT_ID_REGEX, { message: 'agentId must be an Anthropic agent id starting with "agent_".' })
  agentId?: string;

  @ApiPropertyOptional({ description: 'Anthropic managed environment id, e.g. env_013...' })
  @ValidateIf((o: ManagedRuntimeSetupDto) => o.mode === 'existing')
  @IsString()
  @Matches(ANTHROPIC_ENVIRONMENT_ID_REGEX, {
    message: 'environmentId must be an Anthropic environment id starting with "env_".',
  })
  environmentId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Optional Anthropic vault ids used for MCP credentials.' })
  @ValidateIf((o: ManagedRuntimeSetupDto) => o.mode === 'existing')
  @IsArray()
  @IsString({ each: true })
  @Matches(ANTHROPIC_VAULT_ID_REGEX, { each: true, message: 'vaultIds must start with "vlt_".' })
  @ArrayMaxSize(10)
  @IsOptional()
  vaultIds?: string[];
}

/**
 * Legacy shape kept for response payloads and back-compat reads of stored runtime config.
 * New requests should use {@link ManagedRuntimeSetupDto}.
 */
export class ManagedRuntimeDto {
  @ApiProperty({ enum: ['anthropic'] })
  @IsIn(['anthropic'])
  provider: 'anthropic';

  @ApiProperty({ description: 'Anthropic Managed Agent id, e.g. agent_011...' })
  @IsString()
  @Matches(ANTHROPIC_AGENT_ID_REGEX, { message: 'agentId must be an Anthropic agent id starting with "agent_".' })
  agentId: string;

  @ApiProperty({ description: 'Anthropic managed environment id, e.g. env_013...' })
  @IsString()
  @Matches(ANTHROPIC_ENVIRONMENT_ID_REGEX, {
    message: 'environmentId must be an Anthropic environment id starting with "env_".',
  })
  environmentId: string;

  @ApiPropertyOptional({ type: [String], description: 'Optional Anthropic vault ids used for MCP credentials.' })
  @IsArray()
  @IsString({ each: true })
  @Matches(ANTHROPIC_VAULT_ID_REGEX, { each: true, message: 'vaultIds must start with "vlt_".' })
  @ArrayMaxSize(10)
  @IsOptional()
  vaultIds?: string[];

  @ApiPropertyOptional({ type: [AgentMcpServerDto], description: 'MCP servers attached to this agent.' })
  @IsArray()
  @IsOptional()
  mcpServers?: AgentMcpServerDto[];
}

export class AgentCredentialsResponseDto {
  @ApiProperty()
  configured: boolean;
}

export class UpdateAnthropicAgentCredentialsRequestDto {
  @ApiProperty()
  @IsString()
  apiKey: string;
}

export class TestClaudeManagedAgentResponseDto {
  @ApiProperty()
  success: boolean;
}

export { AgentRuntimeEnum };
