import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class VerifyManagedCredentialsCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  @IsEnum(AgentRuntimeProviderIdEnum)
  providerId: AgentRuntimeProviderIdEnum;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ValidateIf((command: VerifyManagedCredentialsCommand) => command.providerId === AgentRuntimeProviderIdEnum.AnthropicAws)
  @IsString()
  @IsNotEmpty()
  externalWorkspaceId?: string;

  @ValidateIf((command: VerifyManagedCredentialsCommand) => command.providerId === AgentRuntimeProviderIdEnum.AnthropicAws)
  @IsString()
  @IsNotEmpty()
  region?: string;
}
