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

export const ANTHROPIC_API_KEY_ENV_VAR = 'NOVU_AGENT_ANTHROPIC_API_KEY' as const;

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
