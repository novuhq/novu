import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetSubscriberPreferenceCommand extends EnvironmentWithSubscriber {
  static create(data: GetSubscriberPreferenceCommand) {
    return CommandHelper.create<GetSubscriberPreferenceCommand>(GetSubscriberPreferenceCommand, data);
  }
  subscriberId: string;
}
