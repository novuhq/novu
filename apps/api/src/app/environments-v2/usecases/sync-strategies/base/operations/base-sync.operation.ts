import { Instrument, PinoLogger } from '@novu/application-generic';
import { LayoutEntity } from '@novu/dal';
import { capitalize } from '../../../../../shared/services/helper/helper.service';
import { IResourceToPublish, ISyncContext, ISyncResult, ResourceTypeEnum } from '../../../../types/sync.types';
import { SyncResultBuilder } from '../../builders/sync-result.builder';
import { SKIP_REASONS, SYNC_ACTIONS } from '../../constants/sync.constants';
import { IBaseComparator, IBaseDeleteService, IBaseRepositoryService, IBaseSyncService } from '../interfaces';

interface IResourceSyncDecision<T> {
  resource: T;
  targetResource?: T;
  sync: boolean;
  action: 'created' | 'updated' | 'skipped';
  reason?: string;
}

export abstract class BaseSyncOperation<T> {
  private static readonly COMPARISON_BATCH_SIZE = 5;

  constructor(
    protected logger: PinoLogger,
    protected repositoryService: IBaseRepositoryService<T>,
    protected syncService: IBaseSyncService<T>,
    protected deleteService: IBaseDeleteService<T>,
    protected comparator: IBaseComparator<T>
  ) {}

  protected abstract getResourceType(): ResourceTypeEnum;

  protected abstract getResourceName(resource: T): string;

  async getAvailableResourceIds(sourceEnvironmentId: string, organizationId: string): Promise<string[]> {
    const resources = await this.repositoryService.fetchSyncableResources(sourceEnvironmentId, organizationId);

    return resources.map((resource) => this.repositoryService.getResourceIdentifier(resource));
  }

  private getResourceTypeMessage(): string {
    return this.getResourceType().toString().toLowerCase();
  }

  private getStartingSyncMessage(sourceEnvId: string, targetEnvId: string): string {
    return `Starting ${this.getResourceTypeMessage()} sync from environment ${sourceEnvId} to ${targetEnvId}`;
  }

  private getFoundResourcesMessage(count: number): string {
    return `Found ${count} ${this.getResourceTypeMessage()}s to sync`;
  }

  private getDryRunMessage(): string {
    return 'Dry run mode enabled for sync';
  }

  private getSyncCompleteFailedMessage(error: string): string {
    return `${capitalize(this.getResourceTypeMessage())} sync failed: ${error}`;
  }

  private getSyncSuccessMessage(resourceName: string, action: string): string {
    return `${capitalize(this.getResourceTypeMessage())} ${resourceName} sync ${action} successfully`;
  }

  private getSyncSkipMessage(resourceName: string, action: string): string {
    return `${capitalize(this.getResourceTypeMessage())} ${resourceName} sync ${action} skipped`;
  }

  private getSyncFailedMessage(resourceName: string, error: string): string {
    return `${capitalize(this.getResourceTypeMessage())} ${resourceName} sync failed: ${error}`;
  }

  private getDeleteSuccessMessage(resourceName: string): string {
    return `${capitalize(this.getResourceTypeMessage())} ${resourceName} deleted successfully`;
  }

  private getDeleteFailedMessage(resourceName: string, error: string): string {
    return `${capitalize(this.getResourceTypeMessage())} ${resourceName} deletion failed: ${error}`;
  }

  @Instrument()
  async execute(context: ISyncContext): Promise<ISyncResult> {
    this.logger.info(this.getStartingSyncMessage(context.sourceEnvironmentId, context.targetEnvironmentId));

    const resultBuilder = new SyncResultBuilder(this.getResourceType());

    try {
      let sourceResources = await this.repositoryService.fetchSyncableResources(
        context.sourceEnvironmentId,
        context.user.organizationId
      );

      // Filter resources if selective sync is requested
      if (context.options.resources?.length) {
        sourceResources = this.filterResourcesForSelectiveSync(sourceResources, context.options.resources);
      }

      this.logger.info(this.getFoundResourcesMessage(sourceResources.length));

      if (context.options.dryRun) {
        this.logger.info(this.getDryRunMessage());

        sourceResources.forEach((resource) => {
          resultBuilder.addSkipped(
            this.repositoryService.getResourceIdentifier(resource),
            this.getResourceName(resource),
            SKIP_REASONS.DRY_RUN
          );
        });

        return resultBuilder.build();
      }

      await this.syncResources(context, sourceResources, resultBuilder);
      await this.handleDeletedResources(context, sourceResources, resultBuilder);

      return resultBuilder.build();
    } catch (error) {
      this.logger.error(this.getSyncCompleteFailedMessage(error.message));
      throw error;
    }
  }

  private filterResourcesForSelectiveSync(sourceResources: T[], resources: IResourceToPublish[]): T[] {
    const currentResourceType = this.getResourceType();
    const resourceIdsToPublish = new Set(
      resources
        .filter((resource) => resource.resourceType === currentResourceType)
        .map((resource) => resource.resourceId)
    );

    if (resourceIdsToPublish.size === 0) {
      return [];
    }

    return sourceResources.filter((resource) => {
      const resourceId = this.repositoryService.getResourceIdentifier(resource);

      return resourceIdsToPublish.has(resourceId);
    });
  }

  private async syncResources(
    context: ISyncContext,
    sourceResources: T[],
    resultBuilder: SyncResultBuilder
  ): Promise<void> {
    let targetResources = await this.repositoryService.fetchSyncableResources(
      context.targetEnvironmentId,
      context.user.organizationId
    );

    // Filter target resources if selective sync is requested
    if (context.options.resources?.length) {
      targetResources = this.filterResourcesForSelectiveSync(targetResources, context.options.resources);
    }

    const targetResourceMap = this.repositoryService.createResourceMap(targetResources);
    const syncDecisions = await this.determineSyncDecisions(context, sourceResources, targetResourceMap);

    for (const decision of syncDecisions) {
      try {
        if (decision.sync) {
          await this.syncService.syncResourceToTarget(context, decision.resource);
          resultBuilder.addSuccess(
            this.repositoryService.getResourceIdentifier(decision.resource),
            this.getResourceName(decision.resource),
            decision.action as 'created' | 'updated'
          );
          this.logger.info(this.getSyncSuccessMessage(this.getResourceName(decision.resource), decision.action));
        } else {
          resultBuilder.addSkipped(
            this.repositoryService.getResourceIdentifier(decision.resource),
            this.getResourceName(decision.resource),
            decision.reason!
          );
          this.logger.info(this.getSyncSkipMessage(this.getResourceName(decision.resource), decision.action));
        }
      } catch (error) {
        resultBuilder.addFailure(
          this.repositoryService.getResourceIdentifier(decision.resource),
          this.getResourceName(decision.resource),
          error.message,
          error.stack
        );
        this.logger.error(this.getSyncFailedMessage(this.getResourceName(decision.resource), error.message));
        throw error;
      }
    }
  }

  @Instrument()
  private async determineSyncDecisions(
    context: ISyncContext,
    sourceResources: T[],
    targetResourceMap: Map<string, T>
  ): Promise<IResourceSyncDecision<T>[]> {
    const batches = this.createBatches(sourceResources, BaseSyncOperation.COMPARISON_BATCH_SIZE);
    const syncDecisions: IResourceSyncDecision<T>[] = [];

    this.logger.info(
      `Determining sync decisions for ${sourceResources.length} resources in ${batches.length} batches of ${BaseSyncOperation.COMPARISON_BATCH_SIZE}`
    );

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      this.logger.debug(`Processing sync decision batch ${i + 1}/${batches.length} with ${batch.length} resources`);

      const batchDecisions = await this.processSyncDecisionBatch(context, batch, targetResourceMap);
      syncDecisions.push(...batchDecisions);
    }

    return syncDecisions;
  }

  @Instrument()
  private async processSyncDecisionBatch(
    context: ISyncContext,
    sourceResources: T[],
    targetResourceMap: Map<string, T>
  ): Promise<IResourceSyncDecision<T>[]> {
    const batchPromises = sourceResources.map(async (resource) => {
      const sourceIdentifier = this.repositoryService.getResourceIdentifier(resource);
      const targetResource = targetResourceMap.get(sourceIdentifier);

      const decision = await this.shouldSyncResource(context, resource, targetResource);

      return {
        resource,
        targetResource,
        sync: decision.sync,
        action: decision.action,
        reason: decision.reason,
      };
    });

    return Promise.all(batchPromises);
  }

  private createBatches<U>(items: U[], batchSize: number): U[][] {
    const batches: U[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  private async handleDeletedResources(
    context: ISyncContext,
    sourceResources: T[],
    resultBuilder: SyncResultBuilder
  ): Promise<void> {
    let targetResources = await this.repositoryService.fetchSyncableResources(
      context.targetEnvironmentId,
      context.user.organizationId
    );

    // Filter target resources if selective sync is requested
    if (context.options.resources?.length) {
      targetResources = this.filterResourcesForSelectiveSync(targetResources, context.options.resources);
    }

    const sourceResourceMap = this.repositoryService.createResourceMap(sourceResources);

    for (const targetResource of targetResources) {
      try {
        const targetIdentifier = this.repositoryService.getResourceIdentifier(targetResource);
        if (!sourceResourceMap.has(targetIdentifier)) {
          await this.deleteService.deleteResourceFromTarget(context, targetResource);
          resultBuilder.addSuccess(
            this.repositoryService.getResourceIdentifier(targetResource),
            this.getResourceName(targetResource),
            SYNC_ACTIONS.DELETED
          );
          this.logger.info(this.getDeleteSuccessMessage(this.getResourceName(targetResource)));
        }
      } catch (error) {
        resultBuilder.addFailure(
          this.repositoryService.getResourceIdentifier(targetResource),
          this.getResourceName(targetResource),
          error.message,
          error.stack
        );
        this.logger.error(this.getDeleteFailedMessage(this.getResourceName(targetResource), error.message));
      }
    }
  }

  private async shouldSyncResource(
    context: ISyncContext,
    resource: T,
    targetResource?: T
  ): Promise<{ sync: boolean; action: 'created' | 'updated' | 'skipped'; reason?: string }> {
    if (!targetResource) {
      return { sync: true, action: SYNC_ACTIONS.CREATED };
    }

    const { resourceChanges, otherDiffs = [] } = await this.comparator.compareResources(
      resource,
      targetResource,
      context.user
    );
    const hasResourceChanges = resourceChanges !== null;
    const hasOtherChanges = otherDiffs.length > 0;

    if (!hasResourceChanges && !hasOtherChanges) {
      return { sync: false, action: SYNC_ACTIONS.SKIPPED, reason: SKIP_REASONS.NO_CHANGES };
    }

    return { sync: true, action: SYNC_ACTIONS.UPDATED };
  }
}
