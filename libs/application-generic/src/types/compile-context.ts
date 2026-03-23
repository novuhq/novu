import type { SubscriberEntity, TenantEntity } from '@novu/dal';
import type { ContextResolved } from '@novu/framework/internal';
import type { ITriggerPayload } from '@novu/shared';

export interface ICompileContext {
  payload?: ITriggerPayload;
  subscriber: SubscriberEntity;
  actor?: SubscriberEntity;
  webhook?: Record<string, unknown>;
  tenant?: TenantEntity;
  context?: ContextResolved;
  env?: Record<string, string>;
  step: {
    digest: boolean;
    events: any[] | undefined;
    total_count: number | undefined;
  };
}
