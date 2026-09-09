import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class RemovePhotonWebhooksCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  webhookUrls: string[];
}
