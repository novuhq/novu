import { IsDefined } from 'class-validator';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { TriggerEventBroadcastCommand } from '../trigger-event';

export class TriggerBroadcastCommand extends TriggerEventBroadcastCommand {
  @IsDefined()
  actor: SubscriberEntity;

  @IsDefined()
  template: NotificationTemplateEntity;
}
