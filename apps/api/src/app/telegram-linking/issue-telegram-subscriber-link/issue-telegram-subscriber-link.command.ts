import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../shared/commands/project.command';

export class IssueTelegramSubscriberLinkCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsString()
  @IsNotEmpty()
  subscriberId: string;
}
