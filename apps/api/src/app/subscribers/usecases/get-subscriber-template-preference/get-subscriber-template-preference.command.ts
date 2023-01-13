import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { NotificationTemplateEntity } from '@novu/dal';
import { IsNotEmpty } from 'class-validator';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentCommand {
  @IsNotEmpty()
  subscriber: { subscriberId: string } | { _subscriberId: string };

  @IsNotEmpty()
  template: NotificationTemplateEntity;
}
