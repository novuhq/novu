import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authToken?: string;
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

export class AgentRuntimeConfigResponseDto {
  @ApiProperty()
  model: string;

  @ApiProperty()
  systemPrompt: string;

  @ApiProperty({ type: [AgentMcpServerDto] })
  mcpServers: AgentMcpServerDto[];

  @ApiProperty({ type: [AgentToolDto] })
  tools: AgentToolDto[];
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
}

export class AgentRuntimeProviderResponseDto {
  @ApiProperty({ enum: AgentRuntimeProviderIdEnum })
  providerId: string;

  @ApiProperty()
  displayName: string;

  @ApiPropertyOptional()
  docsUrl?: string;

  @ApiPropertyOptional()
  statusUrl?: string;

  @ApiPropertyOptional()
  comingSoon?: boolean;

  @ApiProperty({ type: AgentRuntimeCapabilitiesDto })
  capabilities: AgentRuntimeCapabilitiesDto;
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

export class ManagedRuntimeDto {
  @ApiProperty({ enum: AgentRuntimeProviderIdEnum })
  @IsEnum(AgentRuntimeProviderIdEnum)
  providerId: AgentRuntimeProviderIdEnum;

  @ApiPropertyOptional({
    description:
      'ID of an existing Novu integration that holds the provider API key. ' +
      'Mutually exclusive with apiKey. Exactly one of integrationId or apiKey must be provided.',
  })
  @ValidateIf((o) => !o.apiKey)
  @IsString()
  integrationId?: string;

  @ApiPropertyOptional({
    description:
      'Raw provider API key. When provided, the API auto-creates an Integration and a Claude environment. ' +
      'Mutually exclusive with integrationId. Exactly one of integrationId or apiKey must be provided.',
  })
  @ValidateIf((o) => !o.integrationId)
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({
    description:
      'ID of an existing agent on the provider platform. When set, Novu adopts the agent instead of creating a new one.',
  })
  @IsOptional()
  @IsString()
  externalAgentId?: string;

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
