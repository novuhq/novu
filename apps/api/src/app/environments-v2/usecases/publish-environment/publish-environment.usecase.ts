import { Injectable, BadRequestException } from '@nestjs/common';
import { PinoLogger, InstrumentUsecase } from '@novu/application-generic';
import { EnvironmentRepository, ClientSession, BaseRepository } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { PublishEnvironmentCommand } from './publish-environment.command';
import {
  ISyncStrategy,
  IPublishResult,
  ISyncContext,
  ISyncOptions,
  ISyncResult,
  IResourceToPublish,
  ResourceTypeEnum,
} from '../../types/sync.types';
import { EnvironmentValidationService } from '../../services';
import { WorkflowSyncStrategy } from '../sync-strategies/workflow-sync.strategy';
import { LayoutSyncStrategy } from '../sync-strategies/layout-sync.strategy';

@Injectable()
export class PublishEnvironmentUseCase {
  constructor(
    private logger: PinoLogger,
    private environmentValidationService: EnvironmentValidationService,
    private environmentRepository: EnvironmentRepository,
    private workflowSyncStrategy: WorkflowSyncStrategy,
    private layoutSyncStrategy: LayoutSyncStrategy
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

      // Validate resource IDs if provided
      if (command.resourcesToPublish?.length) {
        await this.validateResourceIds(sourceEnvironmentId, command.resourcesToPublish, command.user);
      }

      const options: ISyncOptions = {
        dryRun: command.dryRun || false,
        batchSize: 100,
        resourcesToPublish: command.resourcesToPublish,
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
      const strategies = [this.workflowSyncStrategy, this.layoutSyncStrategy];

      // Filter strategies based on resource types if specific resources are provided
      const strategiesToExecute = options.resourcesToPublish?.length
        ? this.filterStrategiesForSelectiveSync(strategies, options.resourcesToPublish)
        : strategies;

      if (options.resourcesToPublish?.length && strategiesToExecute.length === 0) {
        throw new BadRequestException('No supported resource types found in the request');
      }

      const results = await this.executeSync(strategiesToExecute, syncContext);

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

  private filterStrategiesForSelectiveSync(
    strategies: ISyncStrategy[],
    resourcesToPublish: IResourceToPublish[]
  ): ISyncStrategy[] {
    const requestedResourceTypes = new Set(resourcesToPublish.map((resource) => resource.resourceType));

    return strategies.filter((strategy) => requestedResourceTypes.has(strategy.getResourceType()));
  }

  private async validateResourceIds(
    sourceEnvironmentId: string,
    resourcesToPublish: IResourceToPublish[],
    user: UserSessionData
  ): Promise<void> {
    const strategies = [this.workflowSyncStrategy, this.layoutSyncStrategy];
    const invalidResources: string[] = [];

    for (const strategy of strategies) {
      const resourcesOfType = resourcesToPublish.filter(
        (resource) => resource.resourceType === strategy.getResourceType()
      );

      if (resourcesOfType.length === 0) continue;

      // Get all available resources for this type
      const availableResources = await this.getAvailableResourceIds(strategy, sourceEnvironmentId, user.organizationId);

      this.logger.debug(
        `Available ${strategy.getResourceType()} resources in source environment: [${Array.from(availableResources).join(', ')}]`
      );

      // Check which requested resources don't exist
      for (const resource of resourcesOfType) {
        if (!availableResources.has(resource.resourceId)) {
          this.logger.warn(
            `Resource ${resource.resourceType}:${resource.resourceId} not found in available resources: [${Array.from(availableResources).join(', ')}]`
          );
          invalidResources.push(`${resource.resourceType}:${resource.resourceId}`);
        }
      }
    }

    if (invalidResources.length > 0) {
      throw new BadRequestException(`The following resources were not found: ${invalidResources.join(', ')}`);
    }
  }

  private async getAvailableResourceIds(
    strategy: ISyncStrategy,
    sourceEnvironmentId: string,
    organizationId: string
  ): Promise<Set<string>> {
    try {
      const resourceIds = await strategy.getAvailableResourceIds(sourceEnvironmentId, organizationId);

      return new Set(resourceIds);
    } catch (error) {
      this.logger.warn(`Failed to validate resource IDs for ${strategy.getResourceType()}: ${error.message}`);

      return new Set();
    }
  }
}
