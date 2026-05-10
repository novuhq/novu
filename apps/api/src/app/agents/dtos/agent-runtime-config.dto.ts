import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

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

export class ManagedRuntimeDto {
  @ApiProperty({ enum: AgentRuntimeProviderIdEnum })
  @IsEnum(AgentRuntimeProviderIdEnum)
  providerId: AgentRuntimeProviderIdEnum;

  @ApiProperty()
  @IsString()
  integrationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  systemPrompt?: string;
}
