import { Injectable } from '@nestjs/common';
import { LayoutEntity, NotificationTemplateEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { IResourceDiff } from '../../../types/sync.types';
import { IBaseComparator } from '../base/interfaces/base-comparator.interface';
import { LayoutComparator } from '../comparators/layout.comparator';
import { WorkflowComparator } from '../comparators/workflow.comparator';

@Injectable()
export class LayoutComparatorAdapter implements IBaseComparator<LayoutEntity> {
  constructor(private readonly layoutComparator: LayoutComparator) {}

  async compareResources(
    sourceResource: LayoutEntity,
    targetResource: LayoutEntity,
    _: UserSessionData
  ): Promise<{
    resourceChanges: {
      previous: Record<string, any> | null;
      new: Record<string, any> | null;
    } | null;
    otherDiffs?: IResourceDiff[];
  }> {
    const { layoutChanges } = await this.layoutComparator.compareLayouts(sourceResource, targetResource);

    return {
      resourceChanges: layoutChanges,
    };
  }
}
