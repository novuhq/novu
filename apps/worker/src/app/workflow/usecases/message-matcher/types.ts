import type { ITriggerPayload } from '@novu/shared';
import type { SubscriberEntity } from '@novu/dal';

export interface IFilterVariables {
  payload?: ITriggerPayload;
  subscriber?: SubscriberEntity;
  webhook?: Record<string, unknown>;
}
