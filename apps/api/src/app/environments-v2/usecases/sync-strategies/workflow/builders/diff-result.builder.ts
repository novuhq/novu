import { Injectable } from '@nestjs/common';
import { ResourceTypeEnum, IDiffResult, IResourceDiff, DiffActionEnum } from '../../../../types/sync.types';

@Injectable()
export class DiffResultBuilder {
  private results: IDiffResult[] = [];

  addWorkflowDiff(
    sourceResourceId: string | null,
    sourceResourceName: string | null,
    targetResourceId: string | null,
    targetResourceName: string | null,
    diffs: IResourceDiff[]
  ): this {
    if (diffs.length > 0) {
      this.results.push({
        resourceType: ResourceTypeEnum.WORKFLOW,
        sourceResourceId,
        sourceResourceName,
        targetResourceId,
        targetResourceName,
        diffs,
        summary: this.calculateSummary(diffs),
      });
    }

    return this;
  }

  addWorkflowAdded(sourceResourceId: string, sourceResourceName: string): this {
    const diff: IResourceDiff = {
      sourceResourceId,
      sourceResourceName,
      targetResourceId: null,
      targetResourceName: null,
      resourceType: ResourceTypeEnum.WORKFLOW,
      action: DiffActionEnum.ADDED,
    };

    this.results.push({
      resourceType: ResourceTypeEnum.WORKFLOW,
      sourceResourceId,
      sourceResourceName,
      targetResourceId: null,
      targetResourceName: null,
      diffs: [diff],
      summary: this.calculateSummary([diff]),
    });

    return this;
  }

  addWorkflowDeleted(targetResourceId: string, targetResourceName: string): this {
    const diff: IResourceDiff = {
      sourceResourceId: null,
      sourceResourceName: null,
      targetResourceId,
      targetResourceName,
      resourceType: ResourceTypeEnum.WORKFLOW,
      action: DiffActionEnum.DELETED,
    };

    this.results.push({
      resourceType: ResourceTypeEnum.WORKFLOW,
      sourceResourceId: null,
      sourceResourceName: null,
      targetResourceId,
      targetResourceName,
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
            acc.added += 1;
            break;
          case DiffActionEnum.MODIFIED:
          case DiffActionEnum.MOVED:
            acc.modified += 1;
            break;
          case DiffActionEnum.DELETED:
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
