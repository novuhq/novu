import { NotificationTemplateEntity } from '@novu/dal';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  template: NotificationTemplateEntity;
}
