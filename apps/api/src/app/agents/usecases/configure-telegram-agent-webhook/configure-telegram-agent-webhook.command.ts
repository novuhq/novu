import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ConfigureTelegramAgentWebhookCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationId: string;
}
