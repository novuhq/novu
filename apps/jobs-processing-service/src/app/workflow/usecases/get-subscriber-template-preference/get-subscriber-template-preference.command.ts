import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';

import { EnvironmentWithSubscriber } from '../../../shared/commands';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  template: NotificationTemplateEntity;

  subscriber?: SubscriberEntity;
}
