import type { AgentSkillDto } from '@novu/shared';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ProvisionManagedAgentCommand {
  @IsNotEmpty()
  @IsString()
  agentId: string;

  @IsOptional()
  @IsString()
  name?: string;

  /**
   * When set, the usecase adopts this existing provider agent instead of creating a new one.
   * The agent's name is fetched from the provider and written back to Mongo.
   */
  @IsOptional()
  @IsString()
  externalAgentId?: string;

  /**
   * When set, the usecase adopts this existing provider environment.
   */
  @IsOptional()
  @IsString()
  externalEnvironmentId?: string;

  @IsNotEmpty()
  @IsEnum(AgentRuntimeProviderIdEnum)
  providerId: AgentRuntimeProviderIdEnum;

  /** ID of an existing Novu integration that holds the provider API key and environment. */
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
