import { ResourceTypeEnum, IDiffResult, IResourceDiff, DiffActionEnum, IUserInfo } from '../../../../types/sync.types';

export class DiffResultBuilder {
  private results: IDiffResult[] = [];

  constructor(private readonly resourceType: ResourceTypeEnum) {}

  addResourceDiff(
    sourceResourceId: string | null,
    sourceResourceName: string | null,
    targetResourceId: string | null,
    targetResourceName: string | null,
    changes: IResourceDiff[],
    sourceResourceUpdatedBy?: IUserInfo | null,
    targetResourceUpdatedBy?: IUserInfo | null
  ): this {
    if (changes.length > 0) {
      this.results.push({
        resourceType: this.resourceType,
        sourceResourceId,
        sourceResourceName,
        targetResourceId,
        targetResourceName,
        changes,
        summary: this.calculateSummary(changes),
        sourceResourceUpdatedBy,
        targetResourceUpdatedBy,
      });
    }

    return this;
  }

  addResourceAdded(
    sourceResourceId: string,
    sourceResourceName: string,
    sourceResourceUpdatedBy?: IUserInfo | null
  ): this {
    const diff: IResourceDiff = {
      sourceResourceId,
      sourceResourceName,
      targetResourceId: null,
      targetResourceName: null,
      resourceType: this.resourceType,
      action: DiffActionEnum.ADDED,
      sourceResourceUpdatedBy,
      targetResourceUpdatedBy: null,
    };

    this.results.push({
      resourceType: this.resourceType,
      sourceResourceId,
      sourceResourceName,
      targetResourceId: null,
      targetResourceName: null,
      changes: [diff],
      summary: this.calculateSummary([diff]),
      sourceResourceUpdatedBy,
      targetResourceUpdatedBy: null,
    });

    return this;
  }

  addResourceDeleted(
    targetResourceId: string,
    targetResourceName: string,
    targetResourceUpdatedBy?: IUserInfo | null
  ): this {
    const diff: IResourceDiff = {
      sourceResourceId: null,
      sourceResourceName: null,
      targetResourceId,
      targetResourceName,
      resourceType: this.resourceType,
      action: DiffActionEnum.DELETED,
      sourceResourceUpdatedBy: null,
      targetResourceUpdatedBy,
    };

    this.results.push({
      resourceType: this.resourceType,
      sourceResourceId: null,
      sourceResourceName: null,
      targetResourceId,
      targetResourceName,
      changes: [diff],
      summary: this.calculateSummary([diff]),
      sourceResourceUpdatedBy: null,
      targetResourceUpdatedBy,
    });

    return this;
  }

  // Legacy methods for backward compatibility
  addWorkflowDiff(
    sourceResourceId: string | null,
    sourceResourceName: string | null,
    targetResourceId: string | null,
    targetResourceName: string | null,
    changes: IResourceDiff[],
    sourceResourceUpdatedBy?: IUserInfo | null,
    targetResourceUpdatedBy?: IUserInfo | null
  ): this {
    return this.addResourceDiff(
      sourceResourceId,
      sourceResourceName,
      targetResourceId,
      targetResourceName,
      changes,
      sourceResourceUpdatedBy,
      targetResourceUpdatedBy
    );
  }

  addWorkflowAdded(
    sourceResourceId: string,
    sourceResourceName: string,
    sourceResourceUpdatedBy?: IUserInfo | null
  ): this {
    return this.addResourceAdded(sourceResourceId, sourceResourceName, sourceResourceUpdatedBy);
  }

  addWorkflowDeleted(
    targetResourceId: string,
    targetResourceName: string,
    targetResourceUpdatedBy?: IUserInfo | null
  ): this {
    return this.addResourceDeleted(targetResourceId, targetResourceName, targetResourceUpdatedBy);
  }

  build(): IDiffResult[] {
    return [...this.results];
  }

  getStats() {
    const totalDiffs = this.results.reduce((acc, result) => acc + result.changes.length, 0);
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
