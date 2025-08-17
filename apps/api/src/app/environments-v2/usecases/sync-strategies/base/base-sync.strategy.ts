import { PinoLogger } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { IDiffResult, ISyncContext, ISyncResult, ISyncStrategy, ResourceTypeEnum } from '../../../types/sync.types';

export abstract class BaseSyncStrategy implements ISyncStrategy {
  protected readonly BATCH_SIZE = 100;

  constructor(protected logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  abstract getResourceType(): ResourceTypeEnum;
  abstract execute(context: ISyncContext): Promise<ISyncResult>;
  abstract diff(
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    userContext: UserSessionData
  ): Promise<IDiffResult[]>;
  abstract getAvailableResourceIds(sourceEnvironmentId: string, organizationId: string): Promise<string[]>;

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
}
