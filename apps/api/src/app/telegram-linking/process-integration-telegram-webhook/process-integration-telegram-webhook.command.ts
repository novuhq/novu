import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class ProcessIntegrationTelegramWebhookCommand {
  @IsString()
  @IsNotEmpty()
  environmentId: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsOptional()
  @IsString()
  secretToken?: string;

  @IsObject()
  update: Record<string, unknown>;

  static create(data: {
    environmentId: string;
    integrationIdentifier: string;
    secretToken?: string;
    update: Record<string, unknown>;
  }): ProcessIntegrationTelegramWebhookCommand {
    const command = new ProcessIntegrationTelegramWebhookCommand();
    command.environmentId = data.environmentId;
    command.integrationIdentifier = data.integrationIdentifier;
    command.secretToken = data.secretToken;
    command.update = data.update;

    return command;
  }
}
