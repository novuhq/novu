import {
  DiffActionEnum,
  IDiffResult,
  IResourceDiff,
  IResourceInfo,
  IUserInfo,
  ResourceTypeEnum,
} from '../../../types/sync.types';

export class DiffResultBuilder {
  private results: IDiffResult[] = [];

  constructor(private readonly resourceType: ResourceTypeEnum) {}

  addResourceDiff(
    sourceResource: IResourceInfo | null,
    targetResource: IResourceInfo | null,
    changes: IResourceDiff[]
  ): this {
    if (changes.length > 0) {
      this.results.push({
        resourceType: this.resourceType,
        sourceResource,
        targetResource,
        changes,
        summary: this.calculateSummaryForResource(sourceResource, targetResource, changes),
      });
    }

    return this;
  }

  addResourceAdded(sourceResource: IResourceInfo): this {
    const diff: IResourceDiff = {
      sourceResource,
      targetResource: null,
      resourceType: this.resourceType,
      action: DiffActionEnum.ADDED,
    };

    this.results.push({
      resourceType: this.resourceType,
      sourceResource,
      targetResource: null,
      changes: [diff],
      summary: this.calculateSummary([diff]),
    });

    return this;
  }

  addResourceDeleted(targetResource: IResourceInfo): this {
    const diff: IResourceDiff = {
      sourceResource: null,
      targetResource,
      resourceType: this.resourceType,
      action: DiffActionEnum.DELETED,
    };

    this.results.push({
      resourceType: this.resourceType,
      sourceResource: null,
      targetResource,
      changes: [diff],
      summary: this.calculateSummary([diff]),
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
    targetResourceUpdatedBy?: IUserInfo | null,
    sourceResourceUpdatedAt?: string | null,
    targetResourceUpdatedAt?: string | null
  ): this {
    const sourceResource: IResourceInfo | null =
      sourceResourceId || sourceResourceName
        ? {
            id: sourceResourceId,
            name: sourceResourceName,
            updatedBy: sourceResourceUpdatedBy,
            updatedAt: sourceResourceUpdatedAt,
          }
        : null;

    const targetResource: IResourceInfo | null =
      targetResourceId || targetResourceName
        ? {
            id: targetResourceId,
            name: targetResourceName,
            updatedBy: targetResourceUpdatedBy,
            updatedAt: targetResourceUpdatedAt,
          }
        : null;

    return this.addResourceDiff(sourceResource, targetResource, changes);
  }

  addWorkflowAdded(
    sourceResourceId: string,
    sourceResourceName: string,
    sourceResourceUpdatedBy?: IUserInfo | null,
    sourceResourceUpdatedAt?: string | null
  ): this {
    const sourceResource: IResourceInfo = {
      id: sourceResourceId,
      name: sourceResourceName,
      updatedBy: sourceResourceUpdatedBy,
      updatedAt: sourceResourceUpdatedAt,
    };

    return this.addResourceAdded(sourceResource);
  }

  addWorkflowDeleted(
    targetResourceId: string,
    targetResourceName: string,
    targetResourceUpdatedBy?: IUserInfo | null,
    targetResourceUpdatedAt?: string | null
  ): this {
    const targetResource: IResourceInfo = {
      id: targetResourceId,
      name: targetResourceName,
      updatedBy: targetResourceUpdatedBy,
      updatedAt: targetResourceUpdatedAt,
    };

    return this.addResourceDeleted(targetResource);
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

  private calculateSummaryForResource(
    sourceResource: IResourceInfo | null,
    targetResource: IResourceInfo | null,
    diffs: IResourceDiff[]
  ) {
    const existsInBothEnvironments = sourceResource && targetResource;

    /*
     * For resources that exist in both environments, treat any changes as a modification
     * of the resource itself, not individual step/sub-resource changes
     */
    if (existsInBothEnvironments && diffs.length > 0) {
      return {
        added: 0,
        modified: 1,
        deleted: 0,
        unchanged: 0,
      };
    }

    // For new or deleted resources, use the traditional counting approach
    return this.calculateSummary(diffs);
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
