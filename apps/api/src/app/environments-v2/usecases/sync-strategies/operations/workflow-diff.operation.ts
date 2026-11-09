import { Injectable } from '@nestjs/common';
import { GetWorkflowCommand, GetWorkflowUseCase, PinoLogger, WorkflowDataContainer } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import {
  DiffActionEnum,
  IDiffResult,
  IResourceDiff,
  IResourceInfo,
  IUserInfo,
  ResourceTypeEnum,
} from '../../../types/sync.types';
import { WorkflowComparatorAdapter, WorkflowRepositoryAdapter } from '../adapters';
import { BaseDiffOperation } from '../base/operations/base-diff.operation';
import { DiffResultBuilder } from '../builders/diff-result.builder';
import { WorkflowNormalizer } from '../normalizers/workflow.normalizer';

@Injectable()
export class WorkflowDiffOperation extends BaseDiffOperation<NotificationTemplateEntity> {
  constructor(
    protected logger: PinoLogger,
    protected repositoryAdapter: WorkflowRepositoryAdapter,
    protected comparatorAdapter: WorkflowComparatorAdapter,
    private workflowNormalizer: WorkflowNormalizer,
    private getWorkflowUseCase: GetWorkflowUseCase
  ) {
    super(logger, repositoryAdapter, comparatorAdapter);
  }

  protected getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.WORKFLOW;
  }

  async execute(
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    userContext: UserSessionData,
    workflowDataContainer?: WorkflowDataContainer
  ): Promise<IDiffResult[]> {
    if (!workflowDataContainer) {
      throw new Error('WorkflowDataContainer is required for workflow diff operations');
    }
    this.logger.debug(this.getWorkflowDiffStartMessage(sourceEnvId, targetEnvId));

    const resultBuilder = new DiffResultBuilder(this.getResourceType());

    try {
      const sourceResources = workflowDataContainer.getWorkflowsByEnvironment(sourceEnvId);
      const targetResources = workflowDataContainer.getWorkflowsByEnvironment(targetEnvId);

      this.logger.debug(
        `Filtered ${sourceResources.length} source resources and ${targetResources.length} target resources from container`
      );

      await this.processWorkflowResourceDiffs(
        sourceResources,
        targetResources,
        targetEnvId,
        resultBuilder,
        userContext,
        workflowDataContainer
      );
      await this.processDeletedWorkflowResources(sourceResources, targetResources, resultBuilder);

      this.logger.debug(`Resource diff completed. Processed ${sourceResources.length} resources in batches.`);

      return resultBuilder.build();
    } catch (error) {
      this.logger.error(this.getWorkflowDiffFailedMessage(error.message));
      throw error;
    }
  }

  private getWorkflowDiffStartMessage(sourceEnvId: string, targetEnvId: string): string {
    return `Starting ${this.getResourceType()} diff between environments ${sourceEnvId} and ${targetEnvId}`;
  }

  private getWorkflowDiffFailedMessage(error: string): string {
    return `${this.getResourceType()} diff failed: ${error}`;
  }

  private async processWorkflowResourceDiffs(
    sourceResources: NotificationTemplateEntity[],
    targetResources: NotificationTemplateEntity[],
    targetEnvId: string,
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData,
    workflowDataContainer: WorkflowDataContainer
  ): Promise<void> {
    const targetResourceMap = this.repositoryService.createResourceMap(targetResources);

    const BATCH_SIZE = 10;
    const batches = this.createWorkflowBatches(sourceResources, BATCH_SIZE);

    this.logger.debug(`Processing ${sourceResources.length} resources in ${batches.length} batches of ${BATCH_SIZE}`);

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      this.logger.debug(`Processing batch ${i + 1}/${batches.length} with ${batch.length} resources`);

      await this.processWorkflowBatch(
        batch,
        targetResourceMap,
        targetEnvId,
        resultBuilder,
        userContext,
        workflowDataContainer
      );
    }
  }

  private async processWorkflowBatch(
    sourceResources: NotificationTemplateEntity[],
    targetResourceMap: Map<string, NotificationTemplateEntity>,
    targetEnvId: string,
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData,
    workflowDataContainer: WorkflowDataContainer
  ): Promise<void> {
    const batchPromises = sourceResources.map(async (sourceResource) => {
      const sourceIdentifier = this.repositoryService.getResourceIdentifier(sourceResource);
      const targetResource = targetResourceMap.get(sourceIdentifier);

      if (!targetResource) {
        await this.handleNewWorkflowResource(
          sourceResource,
          targetEnvId,
          resultBuilder,
          userContext,
          workflowDataContainer
        );

        return;
      }

      try {
        const { resourceChanges, otherDiffs } = await this.comparatorAdapter.compareResources(
          sourceResource,
          targetResource,
          userContext,
          workflowDataContainer
        );

        const allDiffs = this.createWorkflowResourceDiffs(
          sourceResource,
          targetResource,
          resourceChanges,
          otherDiffs ?? []
        );

        if (allDiffs.length > 0) {
          resultBuilder.addResourceDiff(
            this.toResourceInfo(sourceResource),
            this.toResourceInfo(targetResource),
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

  private createWorkflowBatches<U>(items: U[], batchSize: number): U[][] {
    const batches: U[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  private async handleNewWorkflowResource(
    sourceResource: NotificationTemplateEntity,
    targetEnvId: string,
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData,
    workflowDataContainer: WorkflowDataContainer
  ): Promise<void> {
    const resourceInfo = this.toResourceInfo(sourceResource);

    // For new workflows, we need to extract steps to analyze dependencies
    const [{ workflowFields, stepDiffs }, translationDiffs] = await Promise.all([
      this.extractStepsFromNewWorkflow(sourceResource, userContext, workflowDataContainer),
      this.comparatorAdapter.compareNewResourceTranslations(sourceResource, targetEnvId, userContext),
    ]);

    const allDiffs: IResourceDiff[] = [
      {
        sourceResource: resourceInfo,
        targetResource: null,
        resourceType: this.getResourceType(),
        action: DiffActionEnum.ADDED,
        // Workflow fields (payload schema, preferences, ...) have no target to compare against,
        // but the publish UI lists them the same way it lists changes on a modified workflow.
        diffs: workflowFields ? { previous: null, new: workflowFields } : undefined,
      },
    ];

    // Add step diffs so dependency analyzer can find layoutIds in control values
    if (stepDiffs.length > 0) {
      allDiffs.push(...stepDiffs);
    }

    allDiffs.push(...translationDiffs);

    resultBuilder.addResourceDiff(resourceInfo, null, allDiffs);
  }

  private createWorkflowResourceDiffs(
    sourceResource: NotificationTemplateEntity,
    targetResource: NotificationTemplateEntity,
    resourceChanges: {
      // biome-ignore lint/suspicious/noExplicitAny: a field snapshot is arbitrary workflow JSON
      // biome-ignore lint/plugin: a field snapshot is arbitrary workflow JSON
      previous: Record<string, any> | null;
      // biome-ignore lint/suspicious/noExplicitAny: a field snapshot is arbitrary workflow JSON
      // biome-ignore lint/plugin: a field snapshot is arbitrary workflow JSON
      new: Record<string, any> | null;
    } | null,
    otherDiffs: IResourceDiff[]
  ): IResourceDiff[] {
    const allDiffs: IResourceDiff[] = [];

    if (resourceChanges) {
      allDiffs.push({
        sourceResource: this.toResourceInfo(sourceResource),
        targetResource: this.toResourceInfo(targetResource),
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

  private async processDeletedWorkflowResources(
    sourceResources: NotificationTemplateEntity[],
    targetResources: NotificationTemplateEntity[],
    resultBuilder: DiffResultBuilder
  ): Promise<void> {
    const sourceResourceMap = this.repositoryService.createResourceMap(sourceResources);

    for (const targetResource of targetResources) {
      const targetIdentifier = this.repositoryService.getResourceIdentifier(targetResource);
      if (!sourceResourceMap.has(targetIdentifier)) {
        resultBuilder.addResourceDeleted(this.toResourceInfo(targetResource));
      }
    }
  }

  protected getResourceName(resource: NotificationTemplateEntity): string {
    return resource.name;
  }

  protected extractUpdatedByInfo(resource: NotificationTemplateEntity): IUserInfo | null {
    if (!resource.updatedBy) {
      return null;
    }

    return {
      _id: resource.updatedBy._id,
      firstName: resource.updatedBy.firstName ?? '',
      lastName: resource.updatedBy.lastName,
      externalId: resource.updatedBy.externalId,
      email: resource.updatedBy.email,
    };
  }

  protected extractUpdatedAtInfo(resource: NotificationTemplateEntity): string | null {
    if (!resource.updatedAt) {
      return null;
    }

    return resource.updatedAt;
  }

  private toResourceInfo(resource: NotificationTemplateEntity): IResourceInfo {
    return {
      id: this.repositoryService.getResourceIdentifier(resource),
      name: this.getResourceName(resource),
      updatedBy: this.extractUpdatedByInfo(resource),
      updatedAt: this.extractUpdatedAtInfo(resource),
    };
  }

  private async extractStepsFromNewWorkflow(
    workflow: NotificationTemplateEntity,
    userContext: UserSessionData,
    workflowDataContainer: WorkflowDataContainer
  ): Promise<{ workflowFields: Record<string, unknown> | null; stepDiffs: IResourceDiff[] }> {
    try {
      const workflowIdentifier = workflow.triggers?.[0]?.identifier;

      if (!workflowIdentifier) {
        this.logger.warn(`Workflow ${workflow._id} has no trigger identifier, skipping step extraction`);

        return { workflowFields: null, stepDiffs: [] };
      }

      this.logger.debug(`Generating workflow DTO for step extraction: ${workflowIdentifier}`);

      const workflowDto = await this.getWorkflowUseCase.execute(
        GetWorkflowCommand.create({
          workflowIdOrInternalId: workflowIdentifier,
          user: {
            ...userContext,
            environmentId: workflow._environmentId,
          },
        }),
        workflowDataContainer
      );

      const normalizedWorkflow = this.workflowNormalizer.normalizeWorkflow(workflowDto);
      const { steps, ...workflowFields } = normalizedWorkflow;

      // Create step diffs for each step as "added"
      return {
        workflowFields,
        stepDiffs: steps.map((step, index) => ({
          sourceResource: {
            id: step.stepId,
            name: step.name,
            updatedBy: null,
            updatedAt: null,
          },
          targetResource: null,
          resourceType: ResourceTypeEnum.STEP,
          stepType: step.type,
          action: DiffActionEnum.ADDED,
          newIndex: index,
          diffs: {
            previous: null,
            new: step,
          },
        })),
      };
    } catch (error) {
      this.logger.error({ error }, `Failed to extract steps from new workflow: ${error.message}`);

      return { workflowFields: null, stepDiffs: [] };
    }
  }
}
