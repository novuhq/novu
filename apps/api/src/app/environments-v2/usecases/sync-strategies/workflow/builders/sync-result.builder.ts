import { Injectable } from '@nestjs/common';
import {
  EntityTypeEnum,
  ISyncResult,
  ISyncedEntity,
  IFailedEntity,
  ISkippedEntity,
} from '../../../../types/sync.types';

@Injectable()
export class SyncResultBuilder {
  private successful: ISyncedEntity[] = [];
  private failed: IFailedEntity[] = [];
  private skipped: ISkippedEntity[] = [];

  addSuccess(entityId: string, entityName: string, action: 'created' | 'updated' | 'deleted'): this {
    this.successful.push({
      entityType: EntityTypeEnum.WORKFLOW,
      entityId,
      entityName,
      action,
    });

    return this;
  }

  addFailure(entityId: string, entityName: string, error: string, stack?: string): this {
    this.failed.push({
      entityType: EntityTypeEnum.WORKFLOW,
      entityId,
      entityName,
      error,
      stack,
    });

    return this;
  }

  addSkipped(entityId: string, entityName: string, reason: string): this {
    this.skipped.push({
      entityType: EntityTypeEnum.WORKFLOW,
      entityId,
      entityName,
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
      entityType: EntityTypeEnum.WORKFLOW,
      successful: [...this.successful],
      failed: [...this.failed],
      skipped: [...this.skipped],
      totalProcessed: this.successful.length + this.failed.length + this.skipped.length,
    };
  }

  reset(): this {
    this.successful = [];
    this.failed = [];
    this.skipped = [];

    return this;
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
