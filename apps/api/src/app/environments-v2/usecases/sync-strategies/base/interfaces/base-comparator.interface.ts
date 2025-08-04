import { UserSessionData } from '@novu/shared';
import { WorkflowDataContainer } from '../../../../../shared/containers/workflow-data.container';
import { IResourceDiff } from '../../../../types/sync.types';

export interface IBaseComparator<T> {
  compareResources(
    sourceResource: T,
    targetResource: T,
    userContext: UserSessionData,
    workflowDataContainer?: WorkflowDataContainer
  ): Promise<{
    resourceChanges: {
      previous: Record<string, unknown> | null;
      new: Record<string, unknown> | null;
    } | null;
    otherDiffs?: IResourceDiff[];
  }>;
}
