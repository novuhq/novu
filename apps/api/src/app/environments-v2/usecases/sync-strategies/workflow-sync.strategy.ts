import { Injectable } from '@nestjs/common';
import { PinoLogger, DeleteWorkflowUseCase, DeleteWorkflowCommand } from '@novu/application-generic';
import { NotificationTemplateRepository, PreferencesRepository } from '@novu/dal';
import { ResourceOriginEnum, WorkflowStatusEnum, PreferencesTypeEnum } from '@novu/shared';
import { diff } from 'deep-object-diff';
import { BaseSyncStrategy } from './base-sync.strategy';
import {
  EntityTypeEnum,
  ISyncContext,
  ISyncResult,
  IDiffResult,
  ISyncedEntity,
  IFailedEntity,
  ISkippedEntity,
  IEntityDiff,
  DiffActionEnum,
} from '../../types/sync.types';
import {
  SyncToEnvironmentUseCase,
  SYNCABLE_WORKFLOW_ORIGINS,
} from '../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.usecase';
import { GetWorkflowUseCase, GetWorkflowCommand } from '../../../workflows-v2/usecases/get-workflow';
import { WorkflowResponseDto } from '../../../workflows-v2/dtos/workflow-response.dto';
import { SyncToEnvironmentCommand } from '../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.command';

// Utility functions for workflow comparison
function normalizeWorkflowForComparison(workflow: WorkflowResponseDto): any {
  return {
    workflowId: workflow.workflowId,
    name: workflow.name,
    active: workflow.active,
    tags: workflow.tags,
    description: workflow.description,
    payloadSchema: workflow.payloadSchema,
    validatePayload: workflow.validatePayload,
    steps: normalizeSteps(workflow.steps || []),
    preferences: workflow.preferences,
  };
}

function normalizeSteps(steps: any[]): any[] {
  return steps.map((step) => ({
    stepId: step.stepId || step._templateId,
    name: step.name || '',
    type: step.template?.type || step.type,
    active: step.active,
    shouldStopOnFail: step.shouldStopOnFail,
    filters: step.filters,
    controlValues: step.controls?.values || step.controlValues || step.template?.content || {},
  }));
}

@Injectable()
export class WorkflowSyncStrategy extends BaseSyncStrategy {
  constructor(
    logger: PinoLogger,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private preferencesRepository: PreferencesRepository,
    private syncToEnvironmentUseCase: SyncToEnvironmentUseCase,
    private getWorkflowUseCase: GetWorkflowUseCase,
    private deleteWorkflowUseCase: DeleteWorkflowUseCase
  ) {
    super(logger);
  }

  getEntityType(): EntityTypeEnum {
    return EntityTypeEnum.WORKFLOW;
  }

  async execute(context: ISyncContext): Promise<ISyncResult> {
    const startTime = Date.now();
    const successful: ISyncedEntity[] = [];
    const failed: IFailedEntity[] = [];
    const skipped: ISkippedEntity[] = [];

    try {
      this.logger.info(`Starting workflow sync from ${context.sourceEnvironmentId} to ${context.targetEnvironmentId}`);

      const sourceWorkflows = await this.fetchSyncableWorkflows(
        context.sourceEnvironmentId,
        context.user.organizationId,
        context.options.includeInactive
      );

      this.logger.info(`Found ${sourceWorkflows.length} workflows to sync`);

      if (context.options.dryRun) {
        this.logger.info('Dry run mode - no actual sync will be performed');

        return this.createSyncResult(
          EntityTypeEnum.WORKFLOW,
          [],
          [],
          sourceWorkflows.map((workflow) => ({
            entityType: EntityTypeEnum.WORKFLOW,
            entityId: workflow._id,
            entityName: workflow.name,
            reason: 'Dry run mode',
          })),
          Date.now() - startTime
        );
      }

      // Fetch target workflows to compare for changes
      const targetWorkflows = await this.fetchSyncableWorkflows(
        context.targetEnvironmentId,
        context.user.organizationId,
        true // include inactive for comparison
      );

      const targetWorkflowMap = new Map(
        targetWorkflows.map((workflow) => [workflow.triggers[0]?.identifier, workflow])
      );

      for (const workflow of sourceWorkflows) {
        try {
          const syncStart = Date.now();
          const sourceIdentifier = workflow.triggers[0]?.identifier;
          const targetWorkflow = targetWorkflowMap.get(sourceIdentifier);

          let action: 'created' | 'updated' | 'skipped' = 'created';
          let shouldSync = true;

          if (targetWorkflow) {
            // Check if there are actual changes (both workflow and step level)
            const { workflowChanges, stepDiffs } = await this.compareWorkflows(workflow, targetWorkflow);
            const hasWorkflowChanges = Object.keys(workflowChanges).length > 0;
            const hasStepChanges = stepDiffs.length > 0;

            if (!hasWorkflowChanges && !hasStepChanges) {
              // No changes detected, skip this workflow
              skipped.push({
                entityType: EntityTypeEnum.WORKFLOW,
                entityId: workflow._id,
                entityName: workflow.name,
                reason: 'No changes detected',
              });
              shouldSync = false;
              action = 'skipped';
            } else {
              action = 'updated';
            }
          }

          if (shouldSync) {
            await this.syncToEnvironmentUseCase.execute(
              SyncToEnvironmentCommand.create({
                user: { ...context.user, environmentId: context.sourceEnvironmentId },
                workflowIdOrInternalId: workflow._id,
                targetEnvironmentId: context.targetEnvironmentId,
              })
            );

            successful.push({
              entityType: EntityTypeEnum.WORKFLOW,
              entityId: workflow._id,
              entityName: workflow.name,
              action,
              duration: Date.now() - syncStart,
            });

            this.logger.info(`Successfully synced workflow: ${workflow.name} (${action})`);
          } else {
            this.logger.info(`Skipped workflow: ${workflow.name} (${action})`);
          }
        } catch (error) {
          failed.push({
            entityType: EntityTypeEnum.WORKFLOW,
            entityId: workflow._id,
            entityName: workflow.name,
            error: error.message,
            stack: error.stack,
          });

          this.logger.error(`Failed to sync workflow ${workflow.name}: ${error.message}`);
        }
      }

      // Handle deleted workflows (exist in target but not in source)
      const sourceWorkflowMap = new Map(
        sourceWorkflows.map((workflow) => [workflow.triggers[0]?.identifier, workflow])
      );

      for (const targetWorkflow of targetWorkflows) {
        try {
          const targetIdentifier = targetWorkflow.triggers[0]?.identifier;
          if (!sourceWorkflowMap.has(targetIdentifier) && targetWorkflow.active) {
            // Workflow exists in target but not in source and is currently active - deactivate it
            const deactivateStart = Date.now();

            await this.deleteWorkflowUseCase.execute(
              DeleteWorkflowCommand.create({
                workflowIdOrInternalId: targetWorkflow._id,
                environmentId: context.targetEnvironmentId,
                organizationId: context.user.organizationId,
                userId: context.user._id,
              })
            );

            successful.push({
              entityType: EntityTypeEnum.WORKFLOW,
              entityId: targetWorkflow._id,
              entityName: targetWorkflow.name,
              action: 'deleted',
              duration: Date.now() - deactivateStart,
            });

            this.logger.info(`Successfully deleted workflow: ${targetWorkflow.name} (removed from source)`);
          }
        } catch (error) {
          failed.push({
            entityType: EntityTypeEnum.WORKFLOW,
            entityId: targetWorkflow._id,
            entityName: targetWorkflow.name,
            error: error.message,
            stack: error.stack,
          });

          this.logger.error(`Failed to delete workflow ${targetWorkflow.name}: ${error.message}`);
        }
      }

      return this.createSyncResult(EntityTypeEnum.WORKFLOW, successful, failed, skipped, Date.now() - startTime);
    } catch (error) {
      this.logger.error(`Workflow sync failed: ${error.message}`);
      throw error;
    }
  }

  async diff(sourceEnvId: string, targetEnvId: string, organizationId: string): Promise<IDiffResult[]> {
    try {
      this.logger.info(`Starting workflow diff between ${sourceEnvId} and ${targetEnvId}`);

      const [sourceWorkflows, targetWorkflows] = await Promise.all([
        this.fetchSyncableWorkflows(sourceEnvId, organizationId, true),
        this.fetchSyncableWorkflows(targetEnvId, organizationId, true),
      ]);

      const results: IDiffResult[] = [];
      const targetWorkflowMap = new Map(
        targetWorkflows.map((workflow) => [workflow.triggers[0]?.identifier, workflow])
      );

      // Check for added and modified workflows
      for (const sourceWorkflow of sourceWorkflows) {
        const sourceIdentifier = sourceWorkflow.triggers[0]?.identifier;
        const targetWorkflow = targetWorkflowMap.get(sourceIdentifier);

        if (!targetWorkflow) {
          // Entire workflow was added
          const workflowDiffs: IEntityDiff[] = [
            {
              entityId: sourceWorkflow._id,
              entityName: sourceWorkflow.name,
              entityType: 'workflow',
              action: DiffActionEnum.ADDED,
            },
          ];

          results.push({
            entityType: EntityTypeEnum.WORKFLOW,
            entityId: sourceWorkflow._id,
            entityName: sourceWorkflow.name,
            diffs: workflowDiffs,
            summary: this.calculateWorkflowSummary(workflowDiffs),
          });
        } else {
          // Compare workflow and get both workflow changes and step diffs
          const { workflowChanges, stepDiffs } = await this.compareWorkflows(sourceWorkflow, targetWorkflow);
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

          // Only create a result if there are changes
          if (allDiffs.length > 0) {
            results.push({
              entityType: EntityTypeEnum.WORKFLOW,
              entityId: sourceWorkflow._id,
              entityName: sourceWorkflow.name,
              diffs: allDiffs,
              summary: this.calculateWorkflowSummary(allDiffs),
            });
          }
        }
      }

      // Check for deleted workflows
      const sourceWorkflowMap = new Map(
        sourceWorkflows.map((workflow) => [workflow.triggers[0]?.identifier, workflow])
      );

      for (const targetWorkflow of targetWorkflows) {
        const targetIdentifier = targetWorkflow.triggers[0]?.identifier;
        if (!sourceWorkflowMap.has(targetIdentifier)) {
          const workflowDiffs: IEntityDiff[] = [
            {
              entityId: targetWorkflow._id,
              entityName: targetWorkflow.name,
              entityType: 'workflow',
              action: DiffActionEnum.DELETED,
            },
          ];

          results.push({
            entityType: EntityTypeEnum.WORKFLOW,
            entityId: targetWorkflow._id,
            entityName: targetWorkflow.name,
            diffs: workflowDiffs,
            summary: this.calculateWorkflowSummary(workflowDiffs),
          });
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Workflow diff failed: ${error.message}`);
      throw error;
    }
  }

  private async fetchSyncableWorkflows(environmentId: string, organizationId: string, includeInactive = false) {
    const query: any = {
      _environmentId: environmentId,
      _organizationId: organizationId,
      origin: { $in: SYNCABLE_WORKFLOW_ORIGINS },
      status: { $ne: WorkflowStatusEnum.ERROR },
    };

    if (!includeInactive) {
      query.active = true;
    }

    return await this.notificationTemplateRepository.find(query);
  }

  private async compareWorkflows(
    sourceWorkflow: any,
    targetWorkflow: any
  ): Promise<{ workflowChanges: Record<string, any>; stepDiffs: IEntityDiff[] }> {
    try {
      // Get proper WorkflowResponseDto for both workflows to ensure we have the correct structure
      const [sourceWorkflowDto, targetWorkflowDto] = await Promise.all([
        this.getWorkflowUseCase.execute(
          GetWorkflowCommand.create({
            user: {
              _id: 'system',
              environmentId: sourceWorkflow._environmentId,
              organizationId: sourceWorkflow._organizationId,
              roles: [],
              permissions: [],
              scheme: 'Bearer' as any,
            },
            workflowIdOrInternalId: sourceWorkflow._id,
          })
        ),
        this.getWorkflowUseCase.execute(
          GetWorkflowCommand.create({
            user: {
              _id: 'system',
              environmentId: targetWorkflow._environmentId,
              organizationId: targetWorkflow._organizationId,
              roles: [],
              permissions: [],
              scheme: 'Bearer' as any,
            },
            workflowIdOrInternalId: targetWorkflow._id,
          })
        ),
      ]);

      // Normalize both workflows using the same logic as sync-to-environment
      const normalizedSource = normalizeWorkflowForComparison(sourceWorkflowDto);
      const normalizedTarget = normalizeWorkflowForComparison(targetWorkflowDto);

      // Separate steps from workflow fields
      const { steps: sourceSteps, ...sourceWithoutSteps } = normalizedSource;
      const { steps: targetSteps, ...targetWithoutSteps } = normalizedTarget;

      // Compare workflow-level fields (excluding steps)
      const workflowDifferences = diff(targetWithoutSteps, sourceWithoutSteps);
      const workflowChanges: Record<string, any> = {};

      for (const [field, value] of Object.entries(workflowDifferences)) {
        workflowChanges[field] = {
          old: targetWithoutSteps[field],
          new: sourceWithoutSteps[field],
        };
      }

      // Compare steps and generate step-level diffs
      const stepDiffs = this.compareStepsAsEntities(
        sourceSteps,
        targetSteps,
        sourceWorkflowDto._id,
        sourceWorkflowDto.name
      );

      return { workflowChanges, stepDiffs };
    } catch (error) {
      this.logger.error(`Failed to compare workflows: ${error.message}`);

      return { workflowChanges: {}, stepDiffs: [] };
    }
  }

  private compareStepsAsEntities(
    sourceSteps: any[],
    targetSteps: any[],
    workflowId: string,
    workflowName: string
  ): IEntityDiff[] {
    const stepDiffs: IEntityDiff[] = [];

    // Create maps for efficient lookup
    const sourceStepMap = new Map(sourceSteps.map((step, index) => [step.stepId, { step, index }]));
    const targetStepMap = new Map(targetSteps.map((step, index) => [step.stepId, { step, index }]));

    const processedSteps = new Set<string>();

    // Process source steps (added/modified/moved)
    sourceSteps.forEach((sourceStep, sourceIndex) => {
      const targetStepData = targetStepMap.get(sourceStep.stepId);

      if (!targetStepData) {
        // Step was added
        const normalizedStep = this.normalizeStepForComparison(sourceStep);
        stepDiffs.push({
          entityId: sourceStep.stepId,
          entityName: sourceStep.name,
          entityType: 'step',
          stepType: sourceStep.type,
          workflowId,
          workflowName,
          action: DiffActionEnum.STEP_ADDED,
          newIndex: sourceIndex,
          changes: {
            step: {
              old: null,
              new: normalizedStep,
            },
          },
        });
      } else {
        const { step: targetStep, index: targetIndex } = targetStepData;
        const stepChanges = this.compareIndividualStep(sourceStep, targetStep);

        if (Object.keys(stepChanges).length > 0) {
          stepDiffs.push({
            entityId: sourceStep.stepId,
            entityName: sourceStep.name,
            entityType: 'step',
            stepType: sourceStep.type,
            workflowId,
            workflowName,
            action: DiffActionEnum.STEP_MODIFIED,
            oldIndex: targetIndex,
            newIndex: sourceIndex,
            changes: stepChanges,
          });
        } else if (sourceIndex !== targetIndex) {
          stepDiffs.push({
            entityId: sourceStep.stepId,
            entityName: sourceStep.name,
            entityType: 'step',
            stepType: sourceStep.type,
            workflowId,
            workflowName,
            action: DiffActionEnum.STEP_MOVED,
            oldIndex: targetIndex,
            newIndex: sourceIndex,
          });
        }
        // Note: We don't add UNCHANGED steps to keep the response clean
      }

      processedSteps.add(sourceStep.stepId);
    });

    // Process deleted steps
    targetSteps.forEach((targetStep, targetIndex) => {
      if (!processedSteps.has(targetStep.stepId)) {
        const normalizedStep = this.normalizeStepForComparison(targetStep);
        stepDiffs.push({
          entityId: targetStep.stepId,
          entityName: targetStep.name,
          entityType: 'step',
          stepType: targetStep.type,
          workflowId,
          workflowName,
          action: DiffActionEnum.STEP_DELETED,
          oldIndex: targetIndex,
          changes: {
            step: {
              old: normalizedStep,
              new: null,
            },
          },
        });
      }
    });

    return stepDiffs;
  }

  private compareIndividualStep(sourceStep: any, targetStep: any): Record<string, { old: any; new: any }> {
    // Normalize steps for comparison
    const normalizedSource = this.normalizeStepForComparison(sourceStep);
    const normalizedTarget = this.normalizeStepForComparison(targetStep);

    // Use deep-object-diff for individual step comparison
    const differences = diff(normalizedTarget, normalizedSource);

    // Transform to expected format
    const changes: Record<string, { old: any; new: any }> = {};
    for (const [field, value] of Object.entries(differences)) {
      changes[field] = {
        old: normalizedTarget[field],
        new: normalizedSource[field],
      };
    }

    return changes;
  }

  private normalizeStepForComparison(step: any): any {
    return {
      stepId: step.stepId,
      name: step.name,
      type: step.type,
      active: step.active,
      shouldStopOnFail: step.shouldStopOnFail,
      filters: step.filters,
      controlValues: step.controlValues,
    };
  }

  private calculateWorkflowSummary(diffs: IEntityDiff[]) {
    return diffs.reduce(
      (acc, diffItem) => {
        switch (diffItem.action) {
          case DiffActionEnum.ADDED:
          case DiffActionEnum.STEP_ADDED:
            acc.added += 1;
            break;
          case DiffActionEnum.MODIFIED:
          case DiffActionEnum.STEP_MODIFIED:
          case DiffActionEnum.STEP_MOVED:
            acc.modified += 1;
            break;
          case DiffActionEnum.DELETED:
          case DiffActionEnum.STEP_DELETED:
            acc.deleted += 1;
            break;
          case DiffActionEnum.UNCHANGED:
            acc.unchanged += 1;
            break;
          default:
            break;
        }

        return acc;
      },
      {
        added: 0,
        modified: 0,
        deleted: 0,
        unchanged: 0,
      }
    );
  }
}
