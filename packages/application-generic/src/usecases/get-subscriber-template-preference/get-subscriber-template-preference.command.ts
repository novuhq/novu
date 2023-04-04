import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';

import { EnvironmentWithSubscriber } from '../../commands/project.command';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  template: NotificationTemplateEntity;

  subscriber?: SubscriberEntity;
}
