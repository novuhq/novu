import { EnvironmentCommand } from '@novu/application-generic';
import { IsDefined, IsOptional } from 'class-validator';

import { WebhookTypes } from '../../interfaces/webhook.interface';

export class WebhookCommand extends EnvironmentCommand {
  @IsDefined()
  providerOrIntegrationId: string;

  @IsDefined()
  body: unknown;

  @IsDefined()
  type: WebhookTypes;

  @IsOptional()
  headers?: Record<string, string>;

  @IsOptional()
  rawBody?: Buffer;
}
