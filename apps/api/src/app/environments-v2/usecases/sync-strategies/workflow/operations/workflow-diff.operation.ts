import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PinoLogger, Instrument } from '@novu/application-generic';
import { NotificationTemplateEntity, LocalizationResourceEnum } from '@novu/dal';
import { UserSessionData } from '@novu/shared';

import { WorkflowComparator } from '../comparators/workflow.comparator';
import { DiffResultBuilder } from '../builders/diff-result.builder';
import { IDiffResult, IResourceDiff, DiffActionEnum, ResourceTypeEnum, IUserInfo } from '../../../../types/sync.types';
import { WORKFLOW_SYNC_MESSAGES } from '../constants/workflow-sync.constants';
import { WorkflowRepositoryService } from './workflow-repository.service';

@Injectable()
export class WorkflowDiffOperation {
  private static readonly BATCH_SIZE = 10;

  constructor(
    private logger: PinoLogger,
    private workflowRepositoryService: WorkflowRepositoryService,
    private workflowComparator: WorkflowComparator,
    private moduleRef: ModuleRef
  ) {}

  @Instrument()
  async execute(
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    userContext: UserSessionData
  ): Promise<IDiffResult[]> {
    this.logger.info(WORKFLOW_SYNC_MESSAGES.STARTING_DIFF(sourceEnvId, targetEnvId));

    const resultBuilder = new DiffResultBuilder(ResourceTypeEnum.WORKFLOW);

    try {
      const [sourceWorkflows, targetWorkflows] = await Promise.all([
        this.workflowRepositoryService.fetchSyncableWorkflows(sourceEnvId, organizationId),
        this.workflowRepositoryService.fetchSyncableWorkflows(targetEnvId, organizationId),
      ]);

      this.logger.info(
        `Fetched ${sourceWorkflows.length} source workflows and ${targetWorkflows.length} target workflows`
      );

      await this.processWorkflowDiffs(
        sourceWorkflows,
        targetWorkflows,
        resultBuilder,
        userContext,
        sourceEnvId,
        targetEnvId,
        organizationId
      );
      await this.processDeletedWorkflows(sourceWorkflows, targetWorkflows, resultBuilder);

      this.logger.info(`Workflow diff completed. Processed ${sourceWorkflows.length} workflows in batches.`);

      return resultBuilder.build();
    } catch (error) {
      this.logger.error(WORKFLOW_SYNC_MESSAGES.DIFF_COMPLETE_FAILED(error.message));
      throw error;
    }
  }

  @Instrument()
  private async processWorkflowDiffs(
    sourceWorkflows: NotificationTemplateEntity[],
    targetWorkflows: NotificationTemplateEntity[],
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData,
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string
  ): Promise<void> {
    const targetWorkflowMap = this.workflowRepositoryService.createWorkflowMap(targetWorkflows);

    // Process workflows in batches for better performance
    const batches = this.createBatches(sourceWorkflows, WorkflowDiffOperation.BATCH_SIZE);

    this.logger.info(
      `Processing ${sourceWorkflows.length} workflows in ${batches.length} batches of ${WorkflowDiffOperation.BATCH_SIZE}`
    );

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      this.logger.debug(`Processing batch ${i + 1}/${batches.length} with ${batch.length} workflows`);

      await this.processBatch(
        batch,
        targetWorkflowMap,
        resultBuilder,
        userContext,
        sourceEnvId,
        targetEnvId,
        organizationId
      );
    }
  }

  @Instrument()
  private async processBatch(
    sourceWorkflows: NotificationTemplateEntity[],
    targetWorkflowMap: Map<string, NotificationTemplateEntity>,
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData,
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string
  ): Promise<void> {
    const batchPromises = sourceWorkflows.map(async (sourceWorkflow) => {
      const sourceIdentifier = this.workflowRepositoryService.getWorkflowIdentifier(sourceWorkflow);
      const targetWorkflow = targetWorkflowMap.get(sourceIdentifier);

      if (!targetWorkflow) {
        // Entire workflow was added
        resultBuilder.addWorkflowAdded(
          this.workflowRepositoryService.getWorkflowIdentifier(sourceWorkflow),
          sourceWorkflow.name,
          this.extractUpdatedByInfo(sourceWorkflow),
          this.extractUpdatedAtInfo(sourceWorkflow)
        );

        return;
      }

      try {
        const { workflowChanges, stepDiffs } = await this.workflowComparator.compareWorkflows(
          sourceWorkflow,
          targetWorkflow,
          userContext
        );

        // Get localization group diffs for this workflow
        const localizationDiffs = await this.getLocalizationDiffs(
          sourceWorkflow,
          targetWorkflow,
          userContext,
          sourceEnvId,
          targetEnvId,
          organizationId
        );

        const allDiffs = this.createWorkflowDiffs(sourceWorkflow, targetWorkflow, workflowChanges, stepDiffs);
        allDiffs.push(...localizationDiffs);

        if (allDiffs.length > 0) {
          resultBuilder.addWorkflowDiff(
            this.workflowRepositoryService.getWorkflowIdentifier(sourceWorkflow),
            sourceWorkflow.name,
            this.workflowRepositoryService.getWorkflowIdentifier(targetWorkflow),
            targetWorkflow.name,
            allDiffs,
            this.extractUpdatedByInfo(sourceWorkflow),
            this.extractUpdatedByInfo(targetWorkflow),
            this.extractUpdatedAtInfo(sourceWorkflow),
            this.extractUpdatedAtInfo(targetWorkflow)
          );
        }
      } catch (error) {
        this.logger.error(`Failed to compare workflow ${sourceWorkflow.name}: ${error.message}`);
        throw error;
      }
    });

    await Promise.all(batchPromises);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  private async processDeletedWorkflows(
    sourceWorkflows: NotificationTemplateEntity[],
    targetWorkflows: NotificationTemplateEntity[],
    resultBuilder: DiffResultBuilder
  ): Promise<void> {
    const sourceWorkflowMap = this.workflowRepositoryService.createWorkflowMap(sourceWorkflows);

    for (const targetWorkflow of targetWorkflows) {
      const targetIdentifier = this.workflowRepositoryService.getWorkflowIdentifier(targetWorkflow);
      if (!sourceWorkflowMap.has(targetIdentifier)) {
        resultBuilder.addWorkflowDeleted(
          this.workflowRepositoryService.getWorkflowIdentifier(targetWorkflow),
          targetWorkflow.name,
          this.extractUpdatedByInfo(targetWorkflow),
          this.extractUpdatedAtInfo(targetWorkflow)
        );
      }
    }
  }

  private createWorkflowDiffs(
    sourceWorkflow: NotificationTemplateEntity,
    targetWorkflow: NotificationTemplateEntity,
    workflowChanges: {
      previous: Record<string, any> | null;
      new: Record<string, any> | null;
    } | null,
    stepDiffs: IResourceDiff[]
  ): IResourceDiff[] {
    const allDiffs: IResourceDiff[] = [];

    // Add workflow-level changes if any
    if (workflowChanges) {
      allDiffs.push({
        sourceResource: {
          id: this.workflowRepositoryService.getWorkflowIdentifier(sourceWorkflow),
          name: sourceWorkflow.name,
          updatedBy: this.extractUpdatedByInfo(sourceWorkflow),
          updatedAt: this.extractUpdatedAtInfo(sourceWorkflow),
        },
        targetResource: {
          id: this.workflowRepositoryService.getWorkflowIdentifier(targetWorkflow),
          name: targetWorkflow.name,
          updatedBy: this.extractUpdatedByInfo(targetWorkflow),
          updatedAt: this.extractUpdatedAtInfo(targetWorkflow),
        },
        resourceType: ResourceTypeEnum.WORKFLOW,
        action: DiffActionEnum.MODIFIED,
        diffs: workflowChanges,
      });
    }

    // Add all step-level diffs with updatedBy and updatedAt information
    const enrichedStepDiffs = stepDiffs.map((stepDiff) => ({
      ...stepDiff,
      sourceResource: stepDiff.sourceResource
        ? {
            ...stepDiff.sourceResource,
            updatedBy: this.extractUpdatedByInfo(sourceWorkflow),
            updatedAt: this.extractUpdatedAtInfo(sourceWorkflow),
          }
        : null,
      targetResource: stepDiff.targetResource
        ? {
            ...stepDiff.targetResource,
            updatedBy: this.extractUpdatedByInfo(targetWorkflow),
            updatedAt: this.extractUpdatedAtInfo(targetWorkflow),
          }
        : null,
    }));

    allDiffs.push(...enrichedStepDiffs);

    return allDiffs;
  }

  private extractUpdatedByInfo(workflow: NotificationTemplateEntity): IUserInfo | null {
    if (!workflow.updatedBy) {
      return null;
    }

    return {
      _id: workflow.updatedBy._id,
      firstName: workflow.updatedBy.firstName,
      lastName: workflow.updatedBy.lastName,
      externalId: workflow.updatedBy.externalId,
    };
  }

  private extractUpdatedAtInfo(workflow: NotificationTemplateEntity): string | null {
    if (!workflow.updatedAt) {
      return null;
    }

    return workflow.updatedAt;
  }

  @Instrument()
  private async getLocalizationDiffs(
    sourceWorkflow: NotificationTemplateEntity,
    targetWorkflow: NotificationTemplateEntity,
    userContext: UserSessionData,
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string
  ): Promise<IResourceDiff[]> {
    try {
      // Use the new DiffTranslationGroups use case from the translation module
      // eslint-disable-next-line global-require
      const diffTranslationGroups = this.moduleRef.get(require('@novu/ee-translation')?.DiffTranslationGroups, {
        strict: false,
      });

      if (!diffTranslationGroups) {
        this.logger.debug('Translation module not available, skipping localization diff');

        return [];
      }

      return await diffTranslationGroups.execute({
        sourceEnvironmentId: sourceEnvId,
        targetEnvironmentId: targetEnvId,
        resourceId: this.workflowRepositoryService.getWorkflowIdentifier(sourceWorkflow),
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId,
        userId: userContext._id,
        environmentId: sourceEnvId, // Required by EnvironmentWithUserCommand
      });
    } catch (error) {
      this.logger.error(`Failed to diff localization groups for workflow ${sourceWorkflow.name}`, error);

      return [];
    }
  }
}
