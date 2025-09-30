import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { BaseRepository } from '@novu/dal';
import { EnvironmentValidationService } from '../../services';
import { IPublishResult, ISyncContext, ISyncOptions, ISyncResult, ISyncStrategy } from '../../types/sync.types';
import { LayoutSyncStrategy } from '../sync-strategies/layout-sync.strategy';
import { WorkflowSyncStrategy } from '../sync-strategies/workflow-sync.strategy';
import { PublishEnvironmentCommand } from './publish-environment.command';

const PUBLISH_BATCH_SIZE = 100;

@Injectable()
export class PublishEnvironmentUseCase {
  constructor(
    private logger: PinoLogger,
    private environmentValidationService: EnvironmentValidationService,
    private workflowSyncStrategy: WorkflowSyncStrategy,
    private layoutSyncStrategy: LayoutSyncStrategy
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: PublishEnvironmentCommand): Promise<IPublishResult> {
    try {
      if (!BaseRepository.isInternalId(command.targetEnvironmentId)) {
        throw new BadRequestException('Invalid environment ID format');
      }

      const sourceEnvironmentId =
        command.sourceEnvironmentId ||
        (await this.environmentValidationService.getDevelopmentEnvironmentId(command.user.organizationId));

      await this.environmentValidationService.validateEnvironments({
        sourceEnvironmentId,
        targetEnvironmentId: command.targetEnvironmentId,
        user: command.user,
      });

      const options: ISyncOptions = {
        dryRun: command.dryRun || false,
        batchSize: PUBLISH_BATCH_SIZE,
        resources: command.resources,
      };

      const syncContext: ISyncContext = {
        sourceEnvironmentId,
        targetEnvironmentId: command.targetEnvironmentId,
        user: command.user,
        options,
      };

      this.logger.info(`Starting environment publish from ${sourceEnvironmentId} to ${command.targetEnvironmentId}`);

      const strategies = [this.workflowSyncStrategy, this.layoutSyncStrategy];

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
      for (const strategy of strategies) {
        const result = await strategy.execute(context);

        results.push(result);
      }
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
