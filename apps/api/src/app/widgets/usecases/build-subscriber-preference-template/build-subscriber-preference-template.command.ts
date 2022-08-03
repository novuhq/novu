import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { NotificationTemplateEntity, SubscriberPreferenceEntity } from '@novu/dal';

export class BuildSubscriberPreferenceTemplateCommand extends EnvironmentWithSubscriber {
  static create(data: BuildSubscriberPreferenceTemplateCommand) {
    return CommandHelper.create<BuildSubscriberPreferenceTemplateCommand>(
      BuildSubscriberPreferenceTemplateCommand,
      data
    );
  }

  template: NotificationTemplateEntity;

  subscriberPreferences?: SubscriberPreferenceEntity[];
}
