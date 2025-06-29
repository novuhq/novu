import { Injectable } from '@nestjs/common';
import { ResourceTypeEnum, IDiffResult, IResourceDiff, DiffActionEnum } from '../../../../types/sync.types';

@Injectable()
export class DiffResultBuilder {
  private results: IDiffResult[] = [];

  addWorkflowDiff(resourceId: string, resourceName: string, diffs: IResourceDiff[]): this {
    if (diffs.length > 0) {
      this.results.push({
        resourceType: ResourceTypeEnum.WORKFLOW,
        resourceId,
        resourceName,
        diffs,
        summary: this.calculateSummary(diffs),
      });
    }

    return this;
  }

  addWorkflowAdded(resourceId: string, resourceName: string): this {
    const diff: IResourceDiff = {
      resourceId,
      resourceName,
      resourceType: ResourceTypeEnum.WORKFLOW,
      action: DiffActionEnum.ADDED,
    };

    this.results.push({
      resourceType: ResourceTypeEnum.WORKFLOW,
      resourceId,
      resourceName,
      diffs: [diff],
      summary: this.calculateSummary([diff]),
    });

    return this;
  }

  addWorkflowDeleted(resourceId: string, resourceName: string): this {
    const diff: IResourceDiff = {
      resourceId,
      resourceName,
      resourceType: ResourceTypeEnum.WORKFLOW,
      action: DiffActionEnum.DELETED,
    };

    this.results.push({
      resourceType: ResourceTypeEnum.WORKFLOW,
      resourceId,
      resourceName,
      diffs: [diff],
      summary: this.calculateSummary([diff]),
    });

    return this;
  }

  build(): IDiffResult[] {
    return [...this.results];
  }

  reset(): this {
    this.results = [];

    return this;
  }

  getStats() {
    const totalDiffs = this.results.reduce((acc, result) => acc + result.diffs.length, 0);
    const summaryTotals = this.results.reduce(
      (acc, result) => ({
        added: acc.added + result.summary.added,
        modified: acc.modified + result.summary.modified,
        deleted: acc.deleted + result.summary.deleted,
        unchanged: acc.unchanged + result.summary.unchanged,
      }),
      { added: 0, modified: 0, deleted: 0, unchanged: 0 }
    );

    return {
      totalResults: this.results.length,
      totalDiffs,
      ...summaryTotals,
    };
  }

  private calculateSummary(diffs: IResourceDiff[]) {
    return diffs.reduce(
      (acc, diffItem) => {
        switch (diffItem.action) {
          case DiffActionEnum.ADDED:
          case DiffActionEnum.STEP_ADDED:
            acc.added += 1;
            break;
          case DiffActionEnum.MODIFIED:
          case DiffActionEnum.STEP_MODIFIED:
          case DiffActionEnum.STEP_MOVED:
            acc.modified += 1;
            break;
          case DiffActionEnum.DELETED:
          case DiffActionEnum.STEP_DELETED:
            acc.deleted += 1;
            break;
          case DiffActionEnum.UNCHANGED:
            acc.unchanged += 1;
            break;
          default:
            break;
        }

        return acc;
      },
      {
        added: 0,
        modified: 0,
        deleted: 0,
        unchanged: 0,
      }
    );
  }
}
