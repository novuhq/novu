import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger, InstrumentUsecase } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { PublishEnvironmentCommand } from './publish-environment.command';
import { EntityTypeEnum, ISyncStrategy, IPublishResult, ISyncContext, ISyncOptions } from '../../types/sync.types';
import { TransactionalSyncService } from '../../services/transactional-sync.service';
import { WorkflowSyncStrategy } from '../sync-strategies/workflow-sync.strategy';

@Injectable()
export class PublishEnvironmentUseCase {
  constructor(
    private logger: PinoLogger,
    private environmentRepository: EnvironmentRepository,
    private transactionalSyncService: TransactionalSyncService,
    private workflowSyncStrategy: WorkflowSyncStrategy
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: PublishEnvironmentCommand): Promise<IPublishResult> {
    try {
      await this.validateEnvironments(command);

      const options: ISyncOptions = {
        dryRun: command.dryRun || false,
        skipExisting: command.skipExisting || false,
        includeInactive: command.includeInactive || false,
        batchSize: command.batchSize || 100,
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
        `Environment publish completed. Processed: ${summary.entities}, ` +
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

  private async validateEnvironments(command: PublishEnvironmentCommand): Promise<void> {
    if (command.sourceEnvironmentId === command.targetEnvironmentId) {
      throw new BadRequestException('Source and target environments cannot be the same');
    }

    try {
      const [sourceEnv, targetEnv] = await Promise.all([
        this.environmentRepository.findOne({
          _id: command.sourceEnvironmentId,
          _organizationId: command.user.organizationId,
        }),
        this.environmentRepository.findOne({
          _id: command.targetEnvironmentId,
          _organizationId: command.user.organizationId,
        }),
      ]);

      if (!sourceEnv) {
        throw new BadRequestException('Source environment not found');
      }

      if (!targetEnv) {
        throw new BadRequestException('Target environment not found');
      }
    } catch (error) {
      // Handle MongoDB cast errors for invalid ObjectIds
      if (error.name === 'CastError') {
        throw new BadRequestException('Invalid environment ID format');
      }
      throw error;
    }
  }

  private async executeSync(strategies: ISyncStrategy[], context: ISyncContext) {
    const results: any[] = [];

    if (context.options.dryRun) {
      // For dry runs, we don't need transactions
      for (const strategy of strategies) {
        const result = await strategy.execute(context);
        results.push(result);
      }
    } else {
      // For actual sync, use transactions for atomicity
      await this.transactionalSyncService.executeWithTransaction(async () => {
        for (const strategy of strategies) {
          const result = await strategy.execute(context);
          results.push(result);
        }
      }, 'environment publish');
    }

    return results;
  }

  private calculateSummary(results: any[]) {
    const summary = {
      entities: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
    };

    for (const result of results) {
      summary.entities += result.totalProcessed;
      summary.successful += result.successful.length;
      summary.failed += result.failed.length;
      summary.skipped += result.skipped.length;
    }

    return summary;
  }
}
