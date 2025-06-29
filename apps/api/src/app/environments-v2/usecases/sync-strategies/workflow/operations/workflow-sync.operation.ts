import { Injectable } from '@nestjs/common';
import { PinoLogger, DeleteWorkflowUseCase, DeleteWorkflowCommand } from '@novu/application-generic';
import { NotificationTemplateRepository } from '@novu/dal';
import { WorkflowStatusEnum } from '@novu/shared';
import {
  SyncToEnvironmentUseCase,
  SYNCABLE_WORKFLOW_ORIGINS,
} from '../../../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.usecase';
import { SyncToEnvironmentCommand } from '../../../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.command';
import { WorkflowComparator } from '../comparators/workflow.comparator';
import { SyncResultBuilder } from '../builders/sync-result.builder';
import { ISyncContext, ISyncResult } from '../../../../types/sync.types';
import {
  WORKFLOW_SYNC_CONSTANTS,
  WORKFLOW_SYNC_MESSAGES,
  WORKFLOW_SYNC_ACTIONS,
  SKIP_REASONS,
} from '../constants/workflow-sync.constants';

@Injectable()
export class WorkflowSyncOperation {
  constructor(
    private logger: PinoLogger,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private syncToEnvironmentUseCase: SyncToEnvironmentUseCase,
    private deleteWorkflowUseCase: DeleteWorkflowUseCase,
    private workflowComparator: WorkflowComparator,
    private syncResultBuilder: SyncResultBuilder
  ) {}

  async execute(context: ISyncContext): Promise<ISyncResult> {
    this.logger.info(WORKFLOW_SYNC_MESSAGES.STARTING_SYNC(context.sourceEnvironmentId, context.targetEnvironmentId));

    const resultBuilder = this.syncResultBuilder.reset();

    try {
      const sourceWorkflows = await this.fetchSyncableWorkflows(
        context.sourceEnvironmentId,
        context.user.organizationId
      );

      this.logger.info(WORKFLOW_SYNC_MESSAGES.FOUND_WORKFLOWS(sourceWorkflows.length));

      if (context.options.dryRun) {
        this.logger.info(WORKFLOW_SYNC_MESSAGES.DRY_RUN_MODE);

        return resultBuilder
          .addSkippedEntities(
            sourceWorkflows.map((workflow) => ({
              resourceType: 'workflow' as any,
              resourceId: workflow._id,
              resourceName: workflow.name,
              reason: SKIP_REASONS.DRY_RUN,
            }))
          )
          .build();
      }

      // Sync workflows
      await this.syncWorkflows(context, sourceWorkflows, resultBuilder);

      // Handle deleted workflows
      await this.handleDeletedWorkflows(context, sourceWorkflows, resultBuilder);

      return resultBuilder.build();
    } catch (error) {
      this.logger.error(WORKFLOW_SYNC_MESSAGES.SYNC_COMPLETE_FAILED(error.message));
      throw error;
    }
  }

  private async syncWorkflows(
    context: ISyncContext,
    sourceWorkflows: any[],
    resultBuilder: SyncResultBuilder
  ): Promise<void> {
    // Fetch target workflows to compare for changes
    const targetWorkflows = await this.fetchSyncableWorkflows(context.targetEnvironmentId, context.user.organizationId);

    const targetWorkflowMap = new Map(targetWorkflows.map((workflow) => [workflow.triggers[0]?.identifier, workflow]));

    for (const workflow of sourceWorkflows) {
      try {
        const sourceIdentifier = workflow.triggers[0]?.identifier;
        const targetWorkflow = targetWorkflowMap.get(sourceIdentifier);

        const shouldSync = await this.shouldSyncWorkflow(context, workflow, targetWorkflow);

        if (shouldSync.sync) {
          await this.syncWorkflowToTarget(context, workflow);
          resultBuilder.addSuccess(workflow._id, workflow.name, shouldSync.action as 'created' | 'updated');
          this.logger.info(WORKFLOW_SYNC_MESSAGES.SYNC_SUCCESS(workflow.name, shouldSync.action));
        } else {
          resultBuilder.addSkipped(workflow._id, workflow.name, shouldSync.reason!);
          this.logger.info(WORKFLOW_SYNC_MESSAGES.SYNC_SKIP(workflow.name, shouldSync.action));
        }
      } catch (error) {
        resultBuilder.addFailure(workflow._id, workflow.name, error.message, error.stack);
        this.logger.error(WORKFLOW_SYNC_MESSAGES.SYNC_FAILED(workflow.name, error.message));
      }
    }
  }

  private async handleDeletedWorkflows(
    context: ISyncContext,
    sourceWorkflows: any[],
    resultBuilder: SyncResultBuilder
  ): Promise<void> {
    const targetWorkflows = await this.fetchSyncableWorkflows(context.targetEnvironmentId, context.user.organizationId);

    const sourceWorkflowMap = new Map(sourceWorkflows.map((workflow) => [workflow.triggers[0]?.identifier, workflow]));

    for (const targetWorkflow of targetWorkflows) {
      try {
        const targetIdentifier = targetWorkflow.triggers[0]?.identifier;
        if (!sourceWorkflowMap.has(targetIdentifier) && targetWorkflow.active) {
          await this.deleteWorkflowFromTarget(context, targetWorkflow);
          resultBuilder.addSuccess(targetWorkflow._id, targetWorkflow.name, WORKFLOW_SYNC_ACTIONS.DELETED);
          this.logger.info(WORKFLOW_SYNC_MESSAGES.DELETE_SUCCESS(targetWorkflow.name));
        }
      } catch (error) {
        resultBuilder.addFailure(targetWorkflow._id, targetWorkflow.name, error.message, error.stack);
        this.logger.error(WORKFLOW_SYNC_MESSAGES.DELETE_FAILED(targetWorkflow.name, error.message));
      }
    }
  }

  private async shouldSyncWorkflow(
    context: ISyncContext,
    workflow: any,
    targetWorkflow?: any
  ): Promise<{ sync: boolean; action: 'created' | 'updated' | 'skipped'; reason?: string }> {
    if (!targetWorkflow) {
      return { sync: true, action: WORKFLOW_SYNC_ACTIONS.CREATED };
    }

    // Check if there are actual changes (both workflow and step level)
    const { workflowChanges, stepDiffs } = await this.workflowComparator.compareWorkflows(
      workflow,
      targetWorkflow,
      context.user
    );
    const hasWorkflowChanges = Object.keys(workflowChanges).length > 0;
    const hasStepChanges = stepDiffs.length > 0;

    if (!hasWorkflowChanges && !hasStepChanges) {
      return { sync: false, action: WORKFLOW_SYNC_ACTIONS.SKIPPED, reason: SKIP_REASONS.NO_CHANGES };
    }

    return { sync: true, action: WORKFLOW_SYNC_ACTIONS.UPDATED };
  }

  private async syncWorkflowToTarget(context: ISyncContext, workflow: any): Promise<void> {
    await this.syncToEnvironmentUseCase.execute(
      SyncToEnvironmentCommand.create({
        user: { ...context.user, environmentId: context.sourceEnvironmentId },
        workflowIdOrInternalId: workflow._id,
        targetEnvironmentId: context.targetEnvironmentId,
      })
    );
  }

  private async deleteWorkflowFromTarget(context: ISyncContext, workflow: any): Promise<void> {
    await this.deleteWorkflowUseCase.execute(
      DeleteWorkflowCommand.create({
        workflowIdOrInternalId: workflow._id,
        environmentId: context.targetEnvironmentId,
        organizationId: context.user.organizationId,
        userId: context.user._id,
      })
    );
  }

  private async fetchSyncableWorkflows(environmentId: string, organizationId: string) {
    return await this.notificationTemplateRepository.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      origin: { $in: SYNCABLE_WORKFLOW_ORIGINS },
      status: { $ne: WorkflowStatusEnum.ERROR },
    });
  }
}
