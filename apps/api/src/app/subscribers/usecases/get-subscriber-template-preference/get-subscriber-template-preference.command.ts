import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { NotificationTemplateEntity } from '@novu/dal';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  template: NotificationTemplateEntity;
}
