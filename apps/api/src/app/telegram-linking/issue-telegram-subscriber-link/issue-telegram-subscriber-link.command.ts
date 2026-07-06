import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../shared/commands/project.command';

export class IssueTelegramSubscriberLinkCommand extends EnvironmentCommand {
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsString()
  @IsNotEmpty()
  subscriberId: string;
}
