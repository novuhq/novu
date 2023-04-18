import type { ITriggerPayload } from '@novu/node';
import type { SubscriberEntity } from '@novu/dal';

export interface IFilterVariables {
  payload?: ITriggerPayload;
  subscriber?: SubscriberEntity;
  webhook?: Record<string, unknown>;
}
