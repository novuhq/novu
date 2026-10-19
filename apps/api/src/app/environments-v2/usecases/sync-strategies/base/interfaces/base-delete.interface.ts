import { ISyncContext } from '../../../../types/sync.types';

export interface IBaseDeleteService<T> {
  deleteResourceFromTarget(context: ISyncContext, resource: T): Promise<void>;
}
