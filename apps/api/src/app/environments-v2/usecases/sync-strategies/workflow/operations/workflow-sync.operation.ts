import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { SyncToEnvironmentUseCase } from '../../../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.usecase';
import { SyncToEnvironmentCommand } from '../../../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.command';
import { WorkflowComparator } from '../comparators/workflow.comparator';
import { SyncResultBuilder } from '../builders/sync-result.builder';
import { ISyncContext, ISyncResult, ResourceTypeEnum } from '../../../../types/sync.types';
import { WORKFLOW_SYNC_MESSAGES, WORKFLOW_SYNC_ACTIONS, SKIP_REASONS } from '../constants/workflow-sync.constants';
import { WorkflowRepositoryService } from './workflow-repository.service';
import { DeleteWorkflowUseCase } from '../../../../../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { DeleteWorkflowCommand } from '../../../../../workflows-v1/usecases/delete-workflow/delete-workflow.command';

@Injectable()
export class WorkflowSyncOperation {
  constructor(
    private logger: PinoLogger,
    private workflowRepositoryService: WorkflowRepositoryService,
    private syncToEnvironmentUseCase: SyncToEnvironmentUseCase,
    private deleteWorkflowUseCase: DeleteWorkflowUseCase,
    private workflowComparator: WorkflowComparator
  ) {}

  async execute(context: ISyncContext): Promise<ISyncResult> {
    this.logger.info(WORKFLOW_SYNC_MESSAGES.STARTING_SYNC(context.sourceEnvironmentId, context.targetEnvironmentId));

    const resultBuilder = new SyncResultBuilder(ResourceTypeEnum.WORKFLOW);

    try {
      const sourceWorkflows = await this.workflowRepositoryService.fetchSyncableWorkflows(
        context.sourceEnvironmentId,
        context.user.organizationId
      );

      this.logger.info(WORKFLOW_SYNC_MESSAGES.FOUND_WORKFLOWS(sourceWorkflows.length));

      if (context.options.dryRun) {
        this.logger.info(WORKFLOW_SYNC_MESSAGES.DRY_RUN_MODE);

        sourceWorkflows.forEach((workflow) => {
          resultBuilder.addSkipped(
            this.workflowRepositoryService.getWorkflowIdentifier(workflow),
            workflow.name,
            SKIP_REASONS.DRY_RUN
          );
        });

        return resultBuilder.build();
      }

      await this.syncWorkflows(context, sourceWorkflows, resultBuilder);

      await this.handleDeletedWorkflows(context, sourceWorkflows, resultBuilder);

      return resultBuilder.build();
    } catch (error) {
      this.logger.error(WORKFLOW_SYNC_MESSAGES.SYNC_COMPLETE_FAILED(error.message));
      throw error;
    }
  }

  private async syncWorkflows(
    context: ISyncContext,
    sourceWorkflows: NotificationTemplateEntity[],
    resultBuilder: SyncResultBuilder
  ): Promise<void> {
    // Fetch target workflows to compare for changes
    const targetWorkflows = await this.workflowRepositoryService.fetchSyncableWorkflows(
      context.targetEnvironmentId,
      context.user.organizationId
    );

    const targetWorkflowMap = this.workflowRepositoryService.createWorkflowMap(targetWorkflows);

    for (const workflow of sourceWorkflows) {
      try {
        const sourceIdentifier = this.workflowRepositoryService.getWorkflowIdentifier(workflow);
        const targetWorkflow = targetWorkflowMap.get(sourceIdentifier);

        const shouldSync = await this.shouldSyncWorkflow(context, workflow, targetWorkflow);

        if (shouldSync.sync) {
          await this.syncWorkflowToTarget(context, workflow);
          resultBuilder.addSuccess(
            this.workflowRepositoryService.getWorkflowIdentifier(workflow),
            workflow.name,
            shouldSync.action as 'created' | 'updated'
          );
          this.logger.info(WORKFLOW_SYNC_MESSAGES.SYNC_SUCCESS(workflow.name, shouldSync.action));
        } else {
          resultBuilder.addSkipped(
            this.workflowRepositoryService.getWorkflowIdentifier(workflow),
            workflow.name,
            shouldSync.reason!
          );
          this.logger.info(WORKFLOW_SYNC_MESSAGES.SYNC_SKIP(workflow.name, shouldSync.action));
        }
      } catch (error) {
        resultBuilder.addFailure(
          this.workflowRepositoryService.getWorkflowIdentifier(workflow),
          workflow.name,
          error.message,
          error.stack
        );
        this.logger.error(WORKFLOW_SYNC_MESSAGES.SYNC_FAILED(workflow.name, error.message));

        throw error;
      }
    }
  }

  private async handleDeletedWorkflows(
    context: ISyncContext,
    sourceWorkflows: NotificationTemplateEntity[],
    resultBuilder: SyncResultBuilder
  ): Promise<void> {
    const targetWorkflows = await this.workflowRepositoryService.fetchSyncableWorkflows(
      context.targetEnvironmentId,
      context.user.organizationId
    );

    const sourceWorkflowMap = this.workflowRepositoryService.createWorkflowMap(sourceWorkflows);

    for (const targetWorkflow of targetWorkflows) {
      try {
        const targetIdentifier = this.workflowRepositoryService.getWorkflowIdentifier(targetWorkflow);
        if (!sourceWorkflowMap.has(targetIdentifier) && targetWorkflow.active) {
          await this.deleteWorkflowFromTarget(context, targetWorkflow);
          resultBuilder.addSuccess(
            this.workflowRepositoryService.getWorkflowIdentifier(targetWorkflow),
            targetWorkflow.name,
            WORKFLOW_SYNC_ACTIONS.DELETED
          );
          this.logger.info(WORKFLOW_SYNC_MESSAGES.DELETE_SUCCESS(targetWorkflow.name));
        }
      } catch (error) {
        resultBuilder.addFailure(
          this.workflowRepositoryService.getWorkflowIdentifier(targetWorkflow),
          targetWorkflow.name,
          error.message,
          error.stack
        );
        this.logger.error(WORKFLOW_SYNC_MESSAGES.DELETE_FAILED(targetWorkflow.name, error.message));
      }
    }
  }

  private async shouldSyncWorkflow(
    context: ISyncContext,
    workflow: NotificationTemplateEntity,
    targetWorkflow?: NotificationTemplateEntity
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
    const hasWorkflowChanges = workflowChanges !== null;
    const hasStepChanges = stepDiffs.length > 0;

    if (!hasWorkflowChanges && !hasStepChanges) {
      return { sync: false, action: WORKFLOW_SYNC_ACTIONS.SKIPPED, reason: SKIP_REASONS.NO_CHANGES };
    }

    return { sync: true, action: WORKFLOW_SYNC_ACTIONS.UPDATED };
  }

  private async syncWorkflowToTarget(context: ISyncContext, workflow: NotificationTemplateEntity): Promise<void> {
    await this.syncToEnvironmentUseCase.execute(
      SyncToEnvironmentCommand.create({
        user: { ...context.user, environmentId: context.sourceEnvironmentId },
        workflowIdOrInternalId: workflow._id,
        targetEnvironmentId: context.targetEnvironmentId,
        session: context.session,
      })
    );
  }

  private async deleteWorkflowFromTarget(context: ISyncContext, workflow: NotificationTemplateEntity): Promise<void> {
    await this.deleteWorkflowUseCase.execute(
      DeleteWorkflowCommand.create({
        workflowIdOrInternalId: workflow._id,
        environmentId: context.targetEnvironmentId,
        organizationId: context.user.organizationId,
        userId: context.user._id,
      })
    );
  }
}
