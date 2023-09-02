import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { IsNotEmpty } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../commands';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  @IsNotEmpty()
  template: NotificationTemplateEntity;

  subscriber?: SubscriberEntity;
}
