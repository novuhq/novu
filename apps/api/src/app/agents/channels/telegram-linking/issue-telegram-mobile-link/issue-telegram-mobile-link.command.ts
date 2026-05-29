import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class IssueTelegramMobileLinkCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subscriberId?: string;
}
