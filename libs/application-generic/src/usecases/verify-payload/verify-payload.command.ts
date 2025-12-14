import { NotificationTemplateEntity } from '@novu/dal';
import { IsDefined } from 'class-validator';
import { BaseCommand } from '../../commands';

export class VerifyPayloadCommand extends BaseCommand {
  @IsDefined()
  payload: Record<string, unknown>;

  @IsDefined()
  template: NotificationTemplateEntity;
}
