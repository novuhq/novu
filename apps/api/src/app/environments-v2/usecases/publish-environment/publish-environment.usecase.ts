import { Injectable, BadRequestException } from '@nestjs/common';
import { PinoLogger, InstrumentUsecase } from '@novu/application-generic';
import { EnvironmentRepository, ClientSession, BaseRepository } from '@novu/dal';
import { PublishEnvironmentCommand } from './publish-environment.command';
import {
  ResourceTypeEnum,
  ISyncStrategy,
  IPublishResult,
  ISyncContext,
  ISyncOptions,
  ISyncResult,
} from '../../types/sync.types';
import { EnvironmentValidationService } from '../../services';
import { WorkflowSyncStrategy } from '../sync-strategies/workflow-sync.strategy';

@Injectable()
export class PublishEnvironmentUseCase {
  constructor(
    private logger: PinoLogger,
    private environmentValidationService: EnvironmentValidationService,
    private environmentRepository: EnvironmentRepository,
    private workflowSyncStrategy: WorkflowSyncStrategy
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: PublishEnvironmentCommand): Promise<IPublishResult> {
    try {
      // First validate the target environment ID format
      if (!BaseRepository.isInternalId(command.targetEnvironmentId)) {
        throw new BadRequestException('Invalid environment ID format');
      }

      // If sourceEnvironmentId is not provided, default to development environment
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
        batchSize: 100,
      };

      const syncContext: ISyncContext = {
        sourceEnvironmentId,
        targetEnvironmentId: command.targetEnvironmentId,
        user: command.user,
        options,
      };

      this.logger.info(`Starting environment publish from ${sourceEnvironmentId} to ${command.targetEnvironmentId}`);

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
      await this.executeWithTransaction(async (session) => {
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

  private async executeWithTransaction<T>(
    operation: (session: ClientSession | null) => Promise<T>,
    operationName: string = 'sync operation'
  ): Promise<T> {
    this.logger.info(`Starting transactional ${operationName}`);

    try {
      return await this.environmentRepository.withTransaction(async (session) => {
        if (session) {
          this.logger.debug(`Executing ${operationName} within transaction`);
        } else {
          this.logger.debug(`Executing ${operationName} without transaction (non-replica set mode)`);
        }

        const result = await operation(session);

        if (session) {
          this.logger.debug(`Successfully completed ${operationName} within transaction`);
        } else {
          this.logger.debug(`Successfully completed ${operationName} without transaction`);
        }

        return result;
      });
    } catch (error) {
      this.logger.error(`Transaction failed for ${operationName}: ${error.message}`);
      throw error;
    }
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
