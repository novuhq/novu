import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { NotificationTemplateEntity } from '@novu/dal';

export class GetSubscriberTemplatePreferenceCommand extends EnvironmentWithSubscriber {
  static create(data: GetSubscriberTemplatePreferenceCommand) {
    return CommandHelper.create<GetSubscriberTemplatePreferenceCommand>(GetSubscriberTemplatePreferenceCommand, data);
  }

  template: NotificationTemplateEntity;
}
