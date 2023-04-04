import { EnvironmentWithSubscriber } from '../../../shared/commands';

export class GetSubscriberPreferenceCommand extends EnvironmentWithSubscriber {
  subscriberId: string;
}
