import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetSubscriberPreferenceCommand extends EnvironmentWithSubscriber {
  subscriberId: string;
}
