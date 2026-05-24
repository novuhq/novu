import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class VerifyManagedCredentialsCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  @IsEnum(AgentRuntimeProviderIdEnum)
  providerId: AgentRuntimeProviderIdEnum;

  @IsNotEmpty()
  @IsString()
  apiKey: string;

  @IsOptional()
  @IsString()
  externalWorkspaceId?: string;
}
