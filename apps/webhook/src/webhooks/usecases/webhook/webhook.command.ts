import { IsDefined } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';
import { WebhookTypes } from './webhook.usecase';

export class WebhookCommand extends EnvironmentCommand {
  @IsDefined()
  providerId: string;

  @IsDefined()
  body: any;

  @IsDefined()
  type: WebhookTypes;
}
