import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { IsNotEmpty } from 'class-validator';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  @IsNotEmpty()
  template: NotificationTemplateEntity;

  subscriber?: SubscriberEntity;
}
