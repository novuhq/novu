import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../shared/commands/project.command';

export class IssueTelegramMobileLinkCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subscriberId?: string;
}
