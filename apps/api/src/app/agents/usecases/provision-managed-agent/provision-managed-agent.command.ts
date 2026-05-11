import type { AgentRuntimeProviderIdEnum, AgentSkillDto } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

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

  @IsNotEmpty()
  providerId: AgentRuntimeProviderIdEnum;

  /**
   * ID of an existing Novu integration. Mutually exclusive with `apiKey`.
   * Exactly one of `integrationId` or `apiKey` must be provided.
   */
  @IsOptional()
  @IsString()
  integrationId?: string;

  /**
   * Raw provider API key. When provided, the usecase auto-creates an Integration
   * and a Claude environment before provisioning the agent.
   * Mutually exclusive with `integrationId`.
   */
  @IsOptional()
  @IsString()
  apiKey?: string;

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
