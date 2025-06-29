import { PinoLogger } from '@novu/application-generic';
import { EntityTypeEnum, ISyncStrategy, ISyncContext, ISyncResult, IDiffResult } from '../../types/sync.types';

export abstract class BaseSyncStrategy implements ISyncStrategy {
  protected readonly BATCH_SIZE = 100;

  constructor(protected logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  abstract getEntityType(): EntityTypeEnum;
  abstract execute(context: ISyncContext): Promise<ISyncResult>;
  abstract diff(sourceEnvId: string, targetEnvId: string, organizationId: string): Promise<IDiffResult[]>;

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
}
