import { IsDefined } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class WebhookCommand extends EnvironmentCommand {
  @IsDefined()
  providerId: string;

  @IsDefined()
  body: any;

  @IsDefined()
  type: 'sms' | 'email';
}
