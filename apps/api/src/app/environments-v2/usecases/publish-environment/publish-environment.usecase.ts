import { Injectable } from '@nestjs/common';
import { PinoLogger, InstrumentUsecase } from '@novu/application-generic';
import { PublishEnvironmentCommand } from './publish-environment.command';
import {
  ResourceTypeEnum,
  ISyncStrategy,
  IPublishResult,
  ISyncContext,
  ISyncOptions,
  ISyncResult,
} from '../../types/sync.types';
import { TransactionalSyncService, EnvironmentValidationService } from '../../services';
import { WorkflowSyncStrategy } from '../sync-strategies/workflow-sync.strategy';

@Injectable()
export class PublishEnvironmentUseCase {
  constructor(
    private logger: PinoLogger,
    private environmentValidationService: EnvironmentValidationService,
    private transactionalSyncService: TransactionalSyncService,
    private workflowSyncStrategy: WorkflowSyncStrategy
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: PublishEnvironmentCommand): Promise<IPublishResult> {
    try {
      await this.environmentValidationService.validateEnvironments({
        sourceEnvironmentId: command.sourceEnvironmentId,
        targetEnvironmentId: command.targetEnvironmentId,
        user: command.user,
      });

      const options: ISyncOptions = {
        dryRun: command.dryRun || false,
        batchSize: 100,
      };

      const syncContext: ISyncContext = {
        sourceEnvironmentId: command.sourceEnvironmentId,
        targetEnvironmentId: command.targetEnvironmentId,
        user: command.user,
        options,
      };

      this.logger.info(
        `Starting environment publish from ${command.sourceEnvironmentId} to ${command.targetEnvironmentId}`
      );

      /*
       * For now, we only support workflow sync
       * In the future, we can add more strategies here
       */
      const strategies = [this.workflowSyncStrategy];

      const results = await this.executeSync(strategies, syncContext);

      const summary = this.calculateSummary(results);

      this.logger.info(
        `Environment publish completed. Processed: ${summary.resources}, ` +
          `Successful: ${summary.successful}, Failed: ${summary.failed}, ` +
          `Skipped: ${summary.skipped}`
      );

      return {
        results,
        summary,
      };
    } catch (error) {
      this.logger.error(`Environment publish failed: ${error.message}`);
      throw error;
    }
  }

  private async executeSync(strategies: ISyncStrategy[], context: ISyncContext): Promise<ISyncResult[]> {
    const results: ISyncResult[] = [];

    if (context.options.dryRun) {
      // For dry runs, we don't need transactions
      for (const strategy of strategies) {
        const result = await strategy.execute(context);
        results.push(result);
      }
    } else {
      // For actual sync, use transactions for atomicity
      await this.transactionalSyncService.executeWithTransaction(async (session) => {
        // Add session to context for transactional operations
        const transactionalContext = { ...context, session };

        for (const strategy of strategies) {
          const result = await strategy.execute(transactionalContext);

          results.push(result);
        }
      }, 'environment publish');
    }

    return results;
  }

  private calculateSummary(results: ISyncResult[]) {
    const summary = {
      resources: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
    };

    for (const result of results) {
      summary.resources += result.totalProcessed;
      summary.successful += result.successful.length;
      summary.failed += result.failed.length;
      summary.skipped += result.skipped.length;
    }

    return summary;
  }
}
