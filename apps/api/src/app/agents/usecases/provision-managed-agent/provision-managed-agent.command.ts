import type { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @IsNotEmpty()
  @IsString()
  environmentId: string;

  @IsNotEmpty()
  @IsString()
  organizationId: string;
}
