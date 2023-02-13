import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  template: NotificationTemplateEntity;

  subscriber?: SubscriberEntity;
}
