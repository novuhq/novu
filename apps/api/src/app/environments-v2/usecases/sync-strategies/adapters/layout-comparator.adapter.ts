import { Injectable } from '@nestjs/common';
import { LayoutEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { WorkflowDataContainer } from '../../../../shared/containers/workflow-data.container';
import { IResourceDiff } from '../../../types/sync.types';
import { IBaseComparator } from '../base/interfaces/base-comparator.interface';
import { LayoutComparator } from '../comparators/layout.comparator';

@Injectable()
export class LayoutComparatorAdapter implements IBaseComparator<LayoutEntity> {
  constructor(private readonly layoutComparator: LayoutComparator) {}

  async compareResources(
    sourceResource: LayoutEntity,
    targetResource: LayoutEntity,
    _: UserSessionData
  ): Promise<{
    resourceChanges: {
      previous: Record<string, unknown> | null;
      new: Record<string, unknown> | null;
    } | null;
    otherDiffs?: IResourceDiff[];
  }> {
    const { layoutChanges } = await this.layoutComparator.compareLayouts(sourceResource, targetResource);

    return {
      resourceChanges: layoutChanges,
    };
  }
}
