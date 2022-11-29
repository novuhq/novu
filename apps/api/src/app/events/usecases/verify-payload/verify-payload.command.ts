import { IsDefined } from 'class-validator';
import { NotificationTemplateEntity } from '@novu/dal';
import { BaseCommand } from '../../../shared/commands/base.command';

export class VerifyPayloadCommand extends BaseCommand {
  @IsDefined()
  payload: Record<string, unknown>;

  @IsDefined()
  template: NotificationTemplateEntity;
}
