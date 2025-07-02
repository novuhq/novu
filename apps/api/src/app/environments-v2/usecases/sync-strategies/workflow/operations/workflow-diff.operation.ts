import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { WorkflowComparator } from '../comparators/workflow.comparator';
import { DiffResultBuilder } from '../builders/diff-result.builder';
import { IDiffResult, IResourceDiff, DiffActionEnum, ResourceTypeEnum, IUserInfo } from '../../../../types/sync.types';
import { WORKFLOW_SYNC_MESSAGES } from '../constants/workflow-sync.constants';
import { WorkflowRepositoryService } from './workflow-repository.service';

@Injectable()
export class WorkflowDiffOperation {
  constructor(
    private logger: PinoLogger,
    private workflowRepositoryService: WorkflowRepositoryService,
    private workflowComparator: WorkflowComparator
  ) {}

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

      await this.processWorkflowDiffs(sourceWorkflows, targetWorkflows, resultBuilder, userContext);
      await this.processDeletedWorkflows(sourceWorkflows, targetWorkflows, resultBuilder);

      return resultBuilder.build();
    } catch (error) {
      this.logger.error(WORKFLOW_SYNC_MESSAGES.DIFF_COMPLETE_FAILED(error.message));
      throw error;
    }
  }

  private async processWorkflowDiffs(
    sourceWorkflows: NotificationTemplateEntity[],
    targetWorkflows: NotificationTemplateEntity[],
    resultBuilder: DiffResultBuilder,
    userContext: UserSessionData
  ): Promise<void> {
    const targetWorkflowMap = this.workflowRepositoryService.createWorkflowMap(targetWorkflows);

    for (const sourceWorkflow of sourceWorkflows) {
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
      } else {
        const { workflowChanges, stepDiffs } = await this.workflowComparator.compareWorkflows(
          sourceWorkflow,
          targetWorkflow,
          userContext
        );

        const allDiffs = this.createWorkflowDiffs(sourceWorkflow, targetWorkflow, workflowChanges, stepDiffs);

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
      }
    }
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

    // updatedAt is already a string in ISO format, return it directly
    return workflow.updatedAt;
  }
}
