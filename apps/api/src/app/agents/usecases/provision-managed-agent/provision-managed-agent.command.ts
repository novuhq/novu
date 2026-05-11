import type { AgentRuntimeProviderIdEnum, AgentSkillDto } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ProvisionManagedAgentCommand {
  @IsNotEmpty()
  @IsString()
  agentId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  providerId: AgentRuntimeProviderIdEnum;

  @IsNotEmpty()
  @IsString()
  integrationId: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tools?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mcpServers?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  skills?: AgentSkillDto[];

  @IsNotEmpty()
  @IsString()
  environmentId: string;

  @IsNotEmpty()
  @IsString()
  organizationId: string;
}
