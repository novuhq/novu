import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateRepository } from '@novu/dal';
import { SYNCABLE_WORKFLOW_ORIGINS } from '../../../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.usecase';
import { WorkflowComparator } from '../comparators/workflow.comparator';
import { DiffResultBuilder } from '../builders/diff-result.builder';
import { IDiffResult, IEntityDiff, DiffActionEnum } from '../../../../types/sync.types';
import { WORKFLOW_SYNC_MESSAGES } from '../constants/workflow-sync.constants';

@Injectable()
export class WorkflowDiffOperation {
  constructor(
    private logger: PinoLogger,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private workflowComparator: WorkflowComparator,
    private diffResultBuilder: DiffResultBuilder
  ) {}

  async execute(
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    userContext: any
  ): Promise<IDiffResult[]> {
    this.logger.info(WORKFLOW_SYNC_MESSAGES.STARTING_DIFF(sourceEnvId, targetEnvId));

    const resultBuilder = this.diffResultBuilder.reset();

    try {
      const [sourceWorkflows, targetWorkflows] = await Promise.all([
        this.fetchSyncableWorkflows(sourceEnvId, organizationId),
        this.fetchSyncableWorkflows(targetEnvId, organizationId),
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
    sourceWorkflows: any[],
    targetWorkflows: any[],
    resultBuilder: DiffResultBuilder,
    userContext: any
  ): Promise<void> {
    const targetWorkflowMap = new Map(targetWorkflows.map((workflow) => [workflow.triggers[0]?.identifier, workflow]));

    // Check for added and modified workflows
    for (const sourceWorkflow of sourceWorkflows) {
      const sourceIdentifier = sourceWorkflow.triggers[0]?.identifier;
      const targetWorkflow = targetWorkflowMap.get(sourceIdentifier);

      if (!targetWorkflow) {
        // Entire workflow was added
        resultBuilder.addWorkflowAdded(sourceWorkflow._id, sourceWorkflow.name);
      } else {
        // Compare workflow and get both workflow changes and step diffs
        const { workflowChanges, stepDiffs } = await this.workflowComparator.compareWorkflows(
          sourceWorkflow,
          targetWorkflow,
          userContext
        );

        const allDiffs = this.createWorkflowDiffs(sourceWorkflow, workflowChanges, stepDiffs);

        // Only create a result if there are changes
        if (allDiffs.length > 0) {
          resultBuilder.addWorkflowDiff(sourceWorkflow._id, sourceWorkflow.name, allDiffs);
        }
      }
    }
  }

  private async processDeletedWorkflows(
    sourceWorkflows: any[],
    targetWorkflows: any[],
    resultBuilder: DiffResultBuilder
  ): Promise<void> {
    const sourceWorkflowMap = new Map(sourceWorkflows.map((workflow) => [workflow.triggers[0]?.identifier, workflow]));

    for (const targetWorkflow of targetWorkflows) {
      const targetIdentifier = targetWorkflow.triggers[0]?.identifier;
      if (!sourceWorkflowMap.has(targetIdentifier)) {
        resultBuilder.addWorkflowDeleted(targetWorkflow._id, targetWorkflow.name);
      }
    }
  }

  private createWorkflowDiffs(sourceWorkflow: any, workflowChanges: any, stepDiffs: IEntityDiff[]): IEntityDiff[] {
    const allDiffs: IEntityDiff[] = [];

    // Add workflow-level changes if any
    if (Object.keys(workflowChanges).length > 0) {
      allDiffs.push({
        entityId: sourceWorkflow._id,
        entityName: sourceWorkflow.name,
        entityType: 'workflow',
        action: DiffActionEnum.MODIFIED,
        changes: workflowChanges,
      });
    }

    // Add all step-level diffs
    allDiffs.push(...stepDiffs);

    return allDiffs;
  }

  private async fetchSyncableWorkflows(environmentId: string, organizationId: string) {
    return await this.notificationTemplateRepository.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      origin: { $in: SYNCABLE_WORKFLOW_ORIGINS },
    });
  }
}
