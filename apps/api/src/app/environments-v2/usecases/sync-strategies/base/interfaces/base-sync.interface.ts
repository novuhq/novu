import { ISyncContext } from '../../../../types/sync.types';

export interface IBaseSyncService<T> {
  syncResourceToTarget(context: ISyncContext, resource: T): Promise<void>;
}
