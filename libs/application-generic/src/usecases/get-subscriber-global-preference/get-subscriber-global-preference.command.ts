import { SubscriberEntity } from '@novu/dal';

import { EnvironmentWithSubscriber } from '../../commands';

export class GetSubscriberGlobalPreferenceCommand extends EnvironmentWithSubscriber {
  subscriber?: SubscriberEntity;
}
