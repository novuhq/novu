import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { IsNotEmpty } from 'class-validator';

import { EnvironmentWithSubscriber } from '../../commands/project.command';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  @IsNotEmpty()
  template: NotificationTemplateEntity;

  subscriber?: SubscriberEntity;
}
