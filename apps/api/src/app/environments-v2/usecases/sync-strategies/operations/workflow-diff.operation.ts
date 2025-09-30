import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { WorkflowDataContainer } from '../../../../shared/containers/workflow-data.container';
import { GetWorkflowCommand, GetWorkflowUseCase } from '../../../../workflows-v2/usecases/get-workflow';
import { DiffActionEnum, IDiffResult, IResourceDiff, IUserInfo, ResourceTypeEnum } from '../../../types/sync.types';
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
    this.logger.info(this.getWorkflowDiffStartMessage(sourceEnvId, targetEnvId));

    const resultBuilder = new DiffResultBuilder(this.getResourceType());

    try {
      const sourceResources = workflowDataContainer.getWorkflowsByEnvironment(sourceEnvId);
      const targetResources = workflowDataContainer.getWorkflowsByEnvironment(targetEnvId);

      this.logger.info(
        `Filtered ${sourceResources.length} source resources and ${targetResources.length} target resources from container`
      );

      await this.processWorkflowResourceDiffs(
        sourceResources,
        targetResources,
        resultBuilder,
        userContext,
        workflowDataContainer
      );
      await this.processDeletedWorkflowResources(sourceResources, targetResources, resultBuilder);

      this.logger.info(`Resource diff completed. Processed ${sourceResources.length} resources in batches.`);

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
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData,
    workflowDataContainer: WorkflowDataContainer
  ): Promise<void> {
    const targetResourceMap = this.repositoryService.createResourceMap(targetResources);

    const BATCH_SIZE = 10;
    const batches = this.createWorkflowBatches(sourceResources, BATCH_SIZE);

    this.logger.info(`Processing ${sourceResources.length} resources in ${batches.length} batches of ${BATCH_SIZE}`);

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      this.logger.debug(`Processing batch ${i + 1}/${batches.length} with ${batch.length} resources`);

      await this.processWorkflowBatch(batch, targetResourceMap, resultBuilder, userContext, workflowDataContainer);
    }
  }

  private async processWorkflowBatch(
    sourceResources: NotificationTemplateEntity[],
    targetResourceMap: Map<string, NotificationTemplateEntity>,
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData,
    workflowDataContainer: WorkflowDataContainer
  ): Promise<void> {
    const batchPromises = sourceResources.map(async (sourceResource) => {
      const sourceIdentifier = this.repositoryService.getResourceIdentifier(sourceResource);
      const targetResource = targetResourceMap.get(sourceIdentifier);

      if (!targetResource) {
        await this.handleNewWorkflowResource(sourceResource, resultBuilder, userContext, workflowDataContainer);

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

  private createWorkflowBatches<U>(items: U[], batchSize: number): U[][] {
    const batches: U[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  private async handleNewWorkflowResource(
    sourceResource: NotificationTemplateEntity,
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData,
    workflowDataContainer: WorkflowDataContainer
  ): Promise<void> {
    const resourceInfo = {
      id: this.repositoryService.getResourceIdentifier(sourceResource),
      name: this.getResourceName(sourceResource),
      updatedBy: this.extractUpdatedByInfo(sourceResource),
      updatedAt: this.extractUpdatedAtInfo(sourceResource),
    };

    // For new workflows, we need to extract steps to analyze dependencies
    const stepDiffs = await this.extractStepsFromNewWorkflow(sourceResource, userContext, workflowDataContainer);

    const allDiffs: IResourceDiff[] = [
      {
        sourceResource: resourceInfo,
        targetResource: null,
        resourceType: this.getResourceType(),
        action: DiffActionEnum.ADDED,
      },
    ];

    // Add step diffs so dependency analyzer can find layoutIds in control values
    if (stepDiffs.length > 0) {
      allDiffs.push(...stepDiffs);
    }

    resultBuilder.addResourceDiff(resourceInfo, null, allDiffs);
  }

  private createWorkflowResourceDiffs(
    sourceResource: NotificationTemplateEntity,
    targetResource: NotificationTemplateEntity,
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

  private async processDeletedWorkflowResources(
    sourceResources: NotificationTemplateEntity[],
    targetResources: NotificationTemplateEntity[],
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

  protected getResourceName(resource: NotificationTemplateEntity): string {
    return resource.name;
  }

  protected extractUpdatedByInfo(resource: NotificationTemplateEntity): IUserInfo | null {
    if (!resource.updatedBy) {
      return null;
    }

    return {
      _id: resource.updatedBy._id,
      firstName: resource.updatedBy.firstName,
      lastName: resource.updatedBy.lastName,
      externalId: resource.updatedBy.externalId,
    };
  }

  protected extractUpdatedAtInfo(resource: NotificationTemplateEntity): string | null {
    if (!resource.updatedAt) {
      return null;
    }

    return resource.updatedAt;
  }

  private async extractStepsFromNewWorkflow(
    workflow: NotificationTemplateEntity,
    userContext: UserSessionData,
    workflowDataContainer: WorkflowDataContainer
  ): Promise<IResourceDiff[]> {
    try {
      const workflowIdentifier = workflow.triggers?.[0]?.identifier;

      if (!workflowIdentifier) {
        this.logger.warn(`Workflow ${workflow._id} has no trigger identifier, skipping step extraction`);

        return [];
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

      // Create step diffs for each step as "added"
      return normalizedWorkflow.steps.map((step, index) => ({
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
      }));
    } catch (error) {
      this.logger.error({ error }, `Failed to extract steps from new workflow: ${error.message}`);

      return [];
    }
  }
}
