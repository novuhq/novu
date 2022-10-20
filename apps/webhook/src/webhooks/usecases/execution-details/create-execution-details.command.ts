import { IsArray, IsDefined } from 'class-validator';
import { EnvironmentCommand } from '@novu/application-generic';
import { MessageEntity } from '@novu/dal';

import { WebhookTypes } from '../../interfaces/webhook.interface';
import { IWebhookResult } from '../../dtos/webhooks-response.dto';

export class CreateExecutionDetailsCommand {
  @IsDefined()
  webhook: WebhookCommand;

  @IsDefined()
  message: MessageEntity;

  @IsDefined()
  webhookEvent: IWebhookResult;
}

export class WebhookCommand extends EnvironmentCommand {
  @IsDefined()
  providerId: string;

  @IsDefined()
  body: any;

  @IsDefined()
  type: WebhookTypes;
}
