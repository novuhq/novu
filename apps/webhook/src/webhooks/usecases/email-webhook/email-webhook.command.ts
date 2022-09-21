import { IsDefined } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';

export class EmailWebhookCommand extends EnvironmentCommand {
  @IsDefined()
  providerId: string;

  @IsDefined()
  body: any;
}
