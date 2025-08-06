import { IFailedEntity, ISkippedEntity, ISyncedEntity, ISyncResult, ResourceTypeEnum } from '../../../types/sync.types';

export class SyncResultBuilder {
  private successful: ISyncedEntity[] = [];
  private failed: IFailedEntity[] = [];
  private skipped: ISkippedEntity[] = [];

  constructor(private readonly resourceType: ResourceTypeEnum) {}

  addSuccess(resourceId: string, resourceName: string, action: 'created' | 'updated' | 'deleted'): this {
    this.successful.push({
      resourceType: this.resourceType,
      resourceId,
      resourceName,
      action,
    });

    return this;
  }

  addFailure(resourceId: string, resourceName: string, error: string, stack?: string): this {
    this.failed.push({
      resourceType: this.resourceType,
      resourceId,
      resourceName,
      error,
      stack,
    });

    return this;
  }

  addSkipped(resourceId: string, resourceName: string, reason: string): this {
    this.skipped.push({
      resourceType: this.resourceType,
      resourceId,
      resourceName,
      reason,
    });

    return this;
  }

  addSuccessfulEntities(entities: ISyncedEntity[]): this {
    this.successful.push(...entities);

    return this;
  }

  addFailedEntities(entities: IFailedEntity[]): this {
    this.failed.push(...entities);

    return this;
  }

  addSkippedEntities(entities: ISkippedEntity[]): this {
    this.skipped.push(...entities);

    return this;
  }

  build(): ISyncResult {
    return {
      resourceType: this.resourceType,
      successful: [...this.successful],
      failed: [...this.failed],
      skipped: [...this.skipped],
      totalProcessed: this.successful.length + this.failed.length + this.skipped.length,
    };
  }

  getStats() {
    return {
      successful: this.successful.length,
      failed: this.failed.length,
      skipped: this.skipped.length,
      totalProcessed: this.successful.length + this.failed.length + this.skipped.length,
    };
  }
}
