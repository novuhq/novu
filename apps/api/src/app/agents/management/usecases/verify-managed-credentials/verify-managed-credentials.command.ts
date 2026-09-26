import { AgentRuntimeProviderIdEnum, AWS_CLAUDE_COMMERCIAL_REGIONS, isGoogleAgentRuntimeProvider } from '@novu/shared';
import { IsEnum, IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class VerifyManagedCredentialsCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  @IsEnum(AgentRuntimeProviderIdEnum)
  providerId: AgentRuntimeProviderIdEnum;

  @ValidateIf((command: VerifyManagedCredentialsCommand) => !isGoogleAgentRuntimeProvider(command.providerId))
  @IsString()
  @IsNotEmpty()
  apiKey?: string;

  @ValidateIf(
    (command: VerifyManagedCredentialsCommand) => command.providerId === AgentRuntimeProviderIdEnum.AnthropicAws
  )
  @IsString()
  @IsNotEmpty()
  externalWorkspaceId?: string;

  @ValidateIf(
    (command: VerifyManagedCredentialsCommand) => command.providerId === AgentRuntimeProviderIdEnum.AnthropicAws
  )
  @IsString()
  @IsNotEmpty()
  @IsIn([...AWS_CLAUDE_COMMERCIAL_REGIONS])
  region?: string;

  @ValidateIf((command: VerifyManagedCredentialsCommand) => isGoogleAgentRuntimeProvider(command.providerId))
  @IsString()
  @IsNotEmpty()
  projectName?: string;

  @ValidateIf((command: VerifyManagedCredentialsCommand) => isGoogleAgentRuntimeProvider(command.providerId))
  @IsString()
  @IsNotEmpty()
  instanceId?: string;
}
