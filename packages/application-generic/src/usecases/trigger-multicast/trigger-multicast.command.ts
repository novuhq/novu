import { IsDefined } from 'class-validator';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { TriggerEventMulticastCommand } from '../trigger-event';

export class TriggerMulticastCommand extends TriggerEventMulticastCommand {
  @IsDefined()
  actor: SubscriberEntity;

  @IsDefined()
  template: NotificationTemplateEntity;
}
