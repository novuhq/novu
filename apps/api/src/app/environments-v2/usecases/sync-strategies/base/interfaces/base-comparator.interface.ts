import { UserSessionData } from '@novu/shared';
import { IResourceDiff } from '../../../../types/sync.types';

export interface IBaseComparator<T> {
  compareResources(
    sourceResource: T,
    targetResource: T,
    userContext: UserSessionData
  ): Promise<{
    resourceChanges: {
      previous: Record<string, any> | null;
      new: Record<string, any> | null;
    } | null;
    otherDiffs?: IResourceDiff[];
  }>;
}
