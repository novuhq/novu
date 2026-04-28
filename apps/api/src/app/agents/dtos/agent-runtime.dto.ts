import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentRuntimeEnum } from '@novu/dal';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export const ANTHROPIC_API_KEY_ENV_VAR = 'NOVU_AGENT_ANTHROPIC_API_KEY' as const;

const ANTHROPIC_AGENT_ID_REGEX = /^agent_[a-zA-Z0-9]+$/;
const ANTHROPIC_ENVIRONMENT_ID_REGEX = /^env_[a-zA-Z0-9]+$/;
const ANTHROPIC_VAULT_ID_REGEX = /^vlt_[a-zA-Z0-9]+$/;

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
