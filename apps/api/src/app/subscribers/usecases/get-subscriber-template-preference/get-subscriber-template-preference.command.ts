import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { IsNotEmpty } from 'class-validator';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentCommand {
  @IsNotEmpty()
  template: NotificationTemplateEntity;

  subscriber?: SubscriberEntity;
}
