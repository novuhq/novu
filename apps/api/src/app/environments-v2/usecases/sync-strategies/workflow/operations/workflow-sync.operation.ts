import { Injectable } from '@nestjs/common';
import { PinoLogger, Instrument } from '@novu/application-generic';
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

interface IWorkflowSyncDecision {
  workflow: NotificationTemplateEntity;
  targetWorkflow?: NotificationTemplateEntity;
  sync: boolean;
  action: 'created' | 'updated' | 'skipped';
  reason?: string;
}

@Injectable()
export class WorkflowSyncOperation {
  private static readonly COMPARISON_BATCH_SIZE = 5;

  constructor(
    private logger: PinoLogger,
    private workflowRepositoryService: WorkflowRepositoryService,
    private syncToEnvironmentUseCase: SyncToEnvironmentUseCase,
    private deleteWorkflowUseCase: DeleteWorkflowUseCase,
    private workflowComparator: WorkflowComparator
  ) {}

  @Instrument()
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

    // First phase: Determine which workflows need syncing using batch processing for comparisons
    const syncDecisions = await this.determineSyncDecisions(context, sourceWorkflows, targetWorkflowMap);

    // Second phase: Execute sync operations sequentially to avoid side effects
    for (const decision of syncDecisions) {
      try {
        if (decision.sync) {
          await this.syncWorkflowToTarget(context, decision.workflow);
          resultBuilder.addSuccess(
            this.workflowRepositoryService.getWorkflowIdentifier(decision.workflow),
            decision.workflow.name,
            decision.action as 'created' | 'updated'
          );
          this.logger.info(WORKFLOW_SYNC_MESSAGES.SYNC_SUCCESS(decision.workflow.name, decision.action));
        } else {
          resultBuilder.addSkipped(
            this.workflowRepositoryService.getWorkflowIdentifier(decision.workflow),
            decision.workflow.name,
            decision.reason!
          );
          this.logger.info(WORKFLOW_SYNC_MESSAGES.SYNC_SKIP(decision.workflow.name, decision.action));
        }
      } catch (error) {
        resultBuilder.addFailure(
          this.workflowRepositoryService.getWorkflowIdentifier(decision.workflow),
          decision.workflow.name,
          error.message,
          error.stack
        );
        this.logger.error(WORKFLOW_SYNC_MESSAGES.SYNC_FAILED(decision.workflow.name, error.message));

        throw error;
      }
    }
  }

  @Instrument()
  private async determineSyncDecisions(
    context: ISyncContext,
    sourceWorkflows: NotificationTemplateEntity[],
    targetWorkflowMap: Map<string, NotificationTemplateEntity>
  ): Promise<IWorkflowSyncDecision[]> {
    const batches = this.createBatches(sourceWorkflows, WorkflowSyncOperation.COMPARISON_BATCH_SIZE);
    const syncDecisions: IWorkflowSyncDecision[] = [];

    this.logger.info(
      `Determining sync decisions for ${sourceWorkflows.length} workflows in ${batches.length} batches of ${WorkflowSyncOperation.COMPARISON_BATCH_SIZE}`
    );

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      this.logger.debug(`Processing sync decision batch ${i + 1}/${batches.length} with ${batch.length} workflows`);

      const batchDecisions = await this.processSyncDecisionBatch(context, batch, targetWorkflowMap);
      syncDecisions.push(...batchDecisions);
    }

    return syncDecisions;
  }

  @Instrument()
  private async processSyncDecisionBatch(
    context: ISyncContext,
    sourceWorkflows: NotificationTemplateEntity[],
    targetWorkflowMap: Map<string, NotificationTemplateEntity>
  ): Promise<IWorkflowSyncDecision[]> {
    const batchPromises = sourceWorkflows.map(async (workflow) => {
      const sourceIdentifier = this.workflowRepositoryService.getWorkflowIdentifier(workflow);
      const targetWorkflow = targetWorkflowMap.get(sourceIdentifier);

      const decision = await this.shouldSyncWorkflow(context, workflow, targetWorkflow);

      return {
        workflow,
        targetWorkflow,
        sync: decision.sync,
        action: decision.action,
        reason: decision.reason,
      };
    });

    return Promise.all(batchPromises);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
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
        if (!sourceWorkflowMap.has(targetIdentifier)) {
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
