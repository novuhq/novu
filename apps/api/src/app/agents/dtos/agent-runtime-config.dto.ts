import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class AgentMcpServerDto {
  @ApiProperty()
  @IsString()
  externalId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  url: string;
}

export class AgentToolDto {
  @ApiProperty()
  @IsString()
  externalId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ['builtin', 'custom'] })
  @IsEnum(['builtin', 'custom'])
  type: 'builtin' | 'custom';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class AgentSkillInputDto {
  @ApiProperty({ enum: ['anthropic', 'custom'] })
  @IsIn(['anthropic', 'custom'])
  type: 'anthropic' | 'custom';

  @ApiProperty({ description: 'Skill identifier, e.g. "xlsx" or "skill_01XJ5..."' })
  @IsString()
  skillId: string;

  @ApiPropertyOptional({ description: 'Version to pin. Omit for latest.' })
  @IsOptional()
  @IsString()
  version?: string | null;
}

export class AgentRuntimeCapabilitiesDto {
  @ApiProperty()
  mcpServers: boolean;

  @ApiProperty()
  tools: boolean;

  @ApiProperty()
  model: boolean;

  @ApiProperty()
  systemPrompt: boolean;

  @ApiProperty()
  skills: boolean;

  @ApiProperty({
    description:
      'Provider exposes a token-vault API where Novu can push OAuth tokens obtained from an MCP handshake. ' +
      'When false, Novu keeps tokens in its own encrypted store.',
  })
  tokenVault: boolean;
}

export class AgentRuntimeConfigResponseDto {
  @ApiProperty()
  model: string;

  @ApiProperty()
  systemPrompt: string;

  @ApiProperty({ type: [AgentMcpServerDto] })
  mcpServers: AgentMcpServerDto[];

  @ApiProperty({ type: [AgentToolDto] })
  tools: AgentToolDto[];

  @ApiPropertyOptional({ type: [AgentSkillInputDto] })
  skills?: AgentSkillInputDto[];

  @ApiPropertyOptional({ type: AgentRuntimeCapabilitiesDto })
  capabilities?: AgentRuntimeCapabilitiesDto;
}

export class PatchAgentRuntimeConfigRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ type: [AgentMcpServerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentMcpServerDto)
  mcpServers?: AgentMcpServerDto[];

  @ApiPropertyOptional({ type: [AgentToolDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentToolDto)
  tools?: AgentToolDto[];

  @ApiPropertyOptional({ type: [AgentSkillInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentSkillInputDto)
  skills?: AgentSkillInputDto[];
}

export class ManagedRuntimeDto {
  @ApiProperty({ enum: AgentRuntimeProviderIdEnum })
  @IsEnum(AgentRuntimeProviderIdEnum)
  providerId: AgentRuntimeProviderIdEnum;

  @ApiProperty({
    description:
      'ID of an existing Novu integration (kind: "agent") that holds the provider API key and ' +
      'provisioned environment. Create the integration first via POST /integrations.',
  })
  @IsNotEmpty()
  @IsString()
  integrationId: string;

  @ApiPropertyOptional({
    description:
      'ID of an existing agent on the provider platform. When set, Novu adopts the agent instead of creating a new one.',
  })
  @IsOptional()
  @IsString()
  externalAgentId?: string;

  @ApiPropertyOptional({
    description: 'ID of an existing environment on the provider platform. When set, Novu adopts the environment.',
  })
  @IsOptional()
  @IsString()
  externalEnvironmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mcpServers?: string[];

  @ApiPropertyOptional({ type: [AgentSkillInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentSkillInputDto)
  skills?: AgentSkillInputDto[];
}
