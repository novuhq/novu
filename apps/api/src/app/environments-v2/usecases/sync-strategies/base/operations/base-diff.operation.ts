import { Instrument, PinoLogger } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { capitalize } from '../../../../../shared/services/helper/helper.service';
import { DiffActionEnum, IDiffResult, IResourceDiff, IUserInfo, ResourceTypeEnum } from '../../../../types/sync.types';
import { DiffResultBuilder } from '../../builders/diff-result.builder';
import { IBaseComparator, IBaseRepositoryService } from '../interfaces';

export abstract class BaseDiffOperation<T> {
  private static readonly BATCH_SIZE = 10;

  constructor(
    protected logger: PinoLogger,
    protected repositoryService: IBaseRepositoryService<T>,
    protected comparator: IBaseComparator<T>
  ) {}

  protected abstract getResourceType(): ResourceTypeEnum;
  protected abstract getResourceName(resource: T): string;
  protected abstract extractUpdatedByInfo(resource: T): IUserInfo | null;
  protected abstract extractUpdatedAtInfo(resource: T): string | null;

  private getStartingDiffMessage(sourceEnvId: string, targetEnvId: string): string {
    return `Starting ${this.getResourceType()} diff between environments ${sourceEnvId} and ${targetEnvId}`;
  }

  private getDiffCompleteFailedMessage(error: string): string {
    return `${capitalize(this.getResourceType())} diff failed: ${error}`;
  }

  @Instrument()
  async execute(
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    userContext: UserSessionData
  ): Promise<IDiffResult[]> {
    this.logger.info(this.getStartingDiffMessage(sourceEnvId, targetEnvId));

    const resultBuilder = new DiffResultBuilder(this.getResourceType());

    try {
      const [sourceResources, targetResources] = await Promise.all([
        this.repositoryService.fetchSyncableResources(sourceEnvId, organizationId),
        this.repositoryService.fetchSyncableResources(targetEnvId, organizationId),
      ]);

      this.logger.info(
        `Fetched ${sourceResources.length} source resources and ${targetResources.length} target resources`
      );

      await this.processResourceDiffs(sourceResources, targetResources, resultBuilder, userContext);
      await this.processDeletedResources(sourceResources, targetResources, resultBuilder);

      this.logger.info(`Resource diff completed. Processed ${sourceResources.length} resources in batches.`);

      return resultBuilder.build();
    } catch (error) {
      this.logger.error(this.getDiffCompleteFailedMessage(error.message));
      throw error;
    }
  }

  @Instrument()
  private async processResourceDiffs(
    sourceResources: T[],
    targetResources: T[],
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData
  ): Promise<void> {
    const targetResourceMap = this.repositoryService.createResourceMap(targetResources);

    const batches = this.createBatches(sourceResources, BaseDiffOperation.BATCH_SIZE);

    this.logger.info(
      `Processing ${sourceResources.length} resources in ${batches.length} batches of ${BaseDiffOperation.BATCH_SIZE}`
    );

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      this.logger.debug(`Processing batch ${i + 1}/${batches.length} with ${batch.length} resources`);

      await this.processBatch(batch, targetResourceMap, resultBuilder, userContext);
    }
  }

  @Instrument()
  private async processBatch(
    sourceResources: T[],
    targetResourceMap: Map<string, T>,
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData
  ): Promise<void> {
    const batchPromises = sourceResources.map(async (sourceResource) => {
      const sourceIdentifier = this.repositoryService.getResourceIdentifier(sourceResource);
      const targetResource = targetResourceMap.get(sourceIdentifier);

      if (!targetResource) {
        await this.handleNewResource(sourceResource, resultBuilder, userContext);

        return;
      }

      try {
        const { resourceChanges, otherDiffs } = await this.comparator.compareResources(
          sourceResource,
          targetResource,
          userContext
        );

        const allDiffs = this.createResourceDiffs(sourceResource, targetResource, resourceChanges, otherDiffs ?? []);

        if (allDiffs.length > 0) {
          resultBuilder.addResourceDiff(
            {
              id: this.repositoryService.getResourceIdentifier(sourceResource),
              name: this.getResourceName(sourceResource),
              updatedBy: this.extractUpdatedByInfo(sourceResource),
              updatedAt: this.extractUpdatedAtInfo(sourceResource),
            },
            {
              id: this.repositoryService.getResourceIdentifier(targetResource),
              name: this.getResourceName(targetResource),
              updatedBy: this.extractUpdatedByInfo(targetResource),
              updatedAt: this.extractUpdatedAtInfo(targetResource),
            },
            allDiffs
          );
        }
      } catch (error) {
        this.logger.error(`Failed to compare resource ${this.getResourceName(sourceResource)}: ${error.message}`);
        throw error;
      }
    });

    await Promise.all(batchPromises);
  }

  private createBatches<U>(items: U[], batchSize: number): U[][] {
    const batches: U[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  private async processDeletedResources(
    sourceResources: T[],
    targetResources: T[],
    resultBuilder: DiffResultBuilder
  ): Promise<void> {
    const sourceResourceMap = this.repositoryService.createResourceMap(sourceResources);

    for (const targetResource of targetResources) {
      const targetIdentifier = this.repositoryService.getResourceIdentifier(targetResource);
      if (!sourceResourceMap.has(targetIdentifier)) {
        resultBuilder.addResourceDeleted({
          id: this.repositoryService.getResourceIdentifier(targetResource),
          name: this.getResourceName(targetResource),
          updatedBy: this.extractUpdatedByInfo(targetResource),
          updatedAt: this.extractUpdatedAtInfo(targetResource),
        });
      }
    }
  }

  protected async handleNewResource(
    sourceResource: T,
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData
  ): Promise<void> {
    resultBuilder.addResourceAdded({
      id: this.repositoryService.getResourceIdentifier(sourceResource),
      name: this.getResourceName(sourceResource),
      updatedBy: this.extractUpdatedByInfo(sourceResource),
      updatedAt: this.extractUpdatedAtInfo(sourceResource),
    });
  }

  private createResourceDiffs(
    sourceResource: T,
    targetResource: T,
    resourceChanges: {
      previous: Record<string, any> | null;
      new: Record<string, any> | null;
    } | null,
    otherDiffs: IResourceDiff[]
  ): IResourceDiff[] {
    const allDiffs: IResourceDiff[] = [];

    if (resourceChanges) {
      allDiffs.push({
        sourceResource: {
          id: this.repositoryService.getResourceIdentifier(sourceResource),
          name: this.getResourceName(sourceResource),
          updatedBy: this.extractUpdatedByInfo(sourceResource),
          updatedAt: this.extractUpdatedAtInfo(sourceResource),
        },
        targetResource: {
          id: this.repositoryService.getResourceIdentifier(targetResource),
          name: this.getResourceName(targetResource),
          updatedBy: this.extractUpdatedByInfo(targetResource),
          updatedAt: this.extractUpdatedAtInfo(targetResource),
        },
        resourceType: this.getResourceType(),
        action: DiffActionEnum.MODIFIED,
        diffs: resourceChanges,
      });
    }

    const enrichedOtherDiffs = otherDiffs.map((otherDiff) => ({
      ...otherDiff,
      sourceResource: otherDiff.sourceResource
        ? {
            ...otherDiff.sourceResource,
            updatedBy: this.extractUpdatedByInfo(sourceResource),
            updatedAt: this.extractUpdatedAtInfo(sourceResource),
          }
        : null,
      targetResource: otherDiff.targetResource
        ? {
            ...otherDiff.targetResource,
            updatedBy: this.extractUpdatedByInfo(targetResource),
            updatedAt: this.extractUpdatedAtInfo(targetResource),
          }
        : null,
    }));

    allDiffs.push(...enrichedOtherDiffs);

    return allDiffs;
  }
}
