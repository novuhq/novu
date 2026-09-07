import { EnvironmentCommand } from '@novu/application-generic';
import { IsDefined } from 'class-validator';

import { WebhookTypes } from '../../interfaces/webhook.interface';

export class WebhookCommand extends EnvironmentCommand {
  @IsDefined()
  providerOrIntegrationId: string;

  @IsDefined()
  body: any;

  @IsDefined()
  type: WebhookTypes;
}
