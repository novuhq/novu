import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../shared/commands/project.command';

export class ConfigureTelegramWebhookCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;
}
