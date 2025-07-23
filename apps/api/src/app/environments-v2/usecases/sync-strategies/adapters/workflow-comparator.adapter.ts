import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { IBaseComparator } from '../base/interfaces/base-comparator.interface';
import { IResourceDiff } from '../../../types/sync.types';
import { WorkflowComparator } from '../comparators/workflow.comparator';

@Injectable()
export class WorkflowComparatorAdapter implements IBaseComparator<NotificationTemplateEntity> {
  constructor(private readonly workflowComparator: WorkflowComparator) {}

  async compareResources(
    sourceResource: NotificationTemplateEntity,
    targetResource: NotificationTemplateEntity,
    userContext: UserSessionData
  ): Promise<{
    resourceChanges: {
      previous: Record<string, any> | null;
      new: Record<string, any> | null;
    } | null;
    otherDiffs?: IResourceDiff[];
  }> {
    const { workflowChanges, otherDiffs } = await this.workflowComparator.compareWorkflows(
      sourceResource,
      targetResource,
      userContext
    );

    return {
      resourceChanges: workflowChanges,
      otherDiffs,
    };
  }
}
