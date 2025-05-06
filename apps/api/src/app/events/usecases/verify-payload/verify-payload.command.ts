import { IsDefined } from 'class-validator';
import { NotificationTemplateEntity } from '@novu/dal';
import { BaseCommand } from '@novu/application-generic';

export class VerifyPayloadCommand extends BaseCommand {
  @IsDefined()
  payload: Record<string, unknown>;

  @IsDefined()
  template: NotificationTemplateEntity;
}
