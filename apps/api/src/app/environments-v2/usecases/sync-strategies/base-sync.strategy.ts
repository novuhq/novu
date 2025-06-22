import { PinoLogger } from '@novu/application-generic';
import { EntityTypeEnum, ISyncStrategy, ISyncContext, ISyncResult, IDiffResult } from '../../types/sync.types';

export abstract class BaseSyncStrategy implements ISyncStrategy {
  protected readonly BATCH_SIZE = 100;

  constructor(protected logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  abstract getEntityType(): EntityTypeEnum;
  abstract execute(context: ISyncContext): Promise<ISyncResult>;
  abstract diff(sourceEnvId: string, targetEnvId: string, organizationId: string): Promise<IDiffResult>;

  protected async processBatch<T>(
    entities: T[],
    processor: (batch: T[]) => Promise<void>,
    batchSize: number = this.BATCH_SIZE
  ): Promise<void> {
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      await processor(batch);
    }
  }

  protected measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();

    return fn().then((result) => ({
      result,
      duration: Date.now() - start,
    }));
  }

  protected createSyncResult(
    entityType: EntityTypeEnum,
    successful: any[] = [],
    failed: any[] = [],
    skipped: any[] = [],
    totalTime: number = 0
  ): ISyncResult {
    return {
      entityType,
      successful,
      failed,
      skipped,
      totalProcessed: successful.length + failed.length + skipped.length,
      totalTime,
    };
  }

  protected createDiffResult(entityType: EntityTypeEnum, diffs: any[] = []): IDiffResult {
    const summary = diffs.reduce(
      (acc, diff) => {
        acc[diff.action] += 1;

        return acc;
      },
      { added: 0, modified: 0, deleted: 0, unchanged: 0 }
    );

    return {
      entityType,
      diffs,
      summary,
    };
  }
}
