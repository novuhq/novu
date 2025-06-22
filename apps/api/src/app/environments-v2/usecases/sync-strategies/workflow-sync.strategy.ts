import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateRepository, PreferencesRepository } from '@novu/dal';
import { WorkflowOriginEnum, WorkflowStatusEnum, PreferencesTypeEnum } from '@novu/shared';
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
import { SyncToEnvironmentCommand } from '../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.command';

// Utility functions for workflow comparison
function normalizeWorkflowForComparison(workflow: any, preferences: any[] = []): any {
  return {
    workflowId: workflow.triggers?.[0]?.identifier || workflow.workflowId,
    name: workflow.name,
    active: workflow.active,
    tags: workflow.tags,
    description: workflow.description,
    payloadSchema: workflow.payloadSchema,
    validatePayload: workflow.validatePayload,
    steps: normalizeSteps(workflow.steps || []),
    preferences: normalizePreferences(preferences),
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
    controlValues: step.template?.content || step.controlValues || {},
  }));
}

function normalizePreferences(preferences: any[]): any {
  return {
    user: preferences.find((p) => p.type === PreferencesTypeEnum.USER_WORKFLOW)?.preferences || null,
    workflow: preferences.find((p) => p.type === PreferencesTypeEnum.WORKFLOW_RESOURCE)?.preferences || null,
  };
}

@Injectable()
export class WorkflowSyncStrategy extends BaseSyncStrategy {
  constructor(
    logger: PinoLogger,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private preferencesRepository: PreferencesRepository,
    private syncToEnvironmentUseCase: SyncToEnvironmentUseCase
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
            // Check if there are actual changes
            const changes = await this.compareWorkflows(workflow, targetWorkflow);
            if (Object.keys(changes).length === 0) {
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

      return this.createSyncResult(EntityTypeEnum.WORKFLOW, successful, failed, skipped, Date.now() - startTime);
    } catch (error) {
      this.logger.error(`Workflow sync failed: ${error.message}`);
      throw error;
    }
  }

  async diff(sourceEnvId: string, targetEnvId: string, organizationId: string): Promise<IDiffResult> {
    try {
      this.logger.info(`Starting workflow diff between ${sourceEnvId} and ${targetEnvId}`);

      const [sourceWorkflows, targetWorkflows] = await Promise.all([
        this.fetchSyncableWorkflows(sourceEnvId, organizationId, true),
        this.fetchSyncableWorkflows(targetEnvId, organizationId, true),
      ]);

      const diffs: IEntityDiff[] = [];
      const targetWorkflowMap = new Map(
        targetWorkflows.map((workflow) => [workflow.triggers[0]?.identifier, workflow])
      );

      // Check for added and modified workflows
      for (const sourceWorkflow of sourceWorkflows) {
        const sourceIdentifier = sourceWorkflow.triggers[0]?.identifier;
        const targetWorkflow = targetWorkflowMap.get(sourceIdentifier);

        if (!targetWorkflow) {
          diffs.push({
            entityId: sourceWorkflow._id,
            entityName: sourceWorkflow.name,
            action: DiffActionEnum.ADDED,
          });
        } else {
          const changes = await this.compareWorkflows(sourceWorkflow, targetWorkflow);
          if (Object.keys(changes).length > 0) {
            diffs.push({
              entityId: sourceWorkflow._id,
              entityName: sourceWorkflow.name,
              action: DiffActionEnum.MODIFIED,
              changes,
            });
          } else {
            diffs.push({
              entityId: sourceWorkflow._id,
              entityName: sourceWorkflow.name,
              action: DiffActionEnum.UNCHANGED,
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
          diffs.push({
            entityId: targetWorkflow._id,
            entityName: targetWorkflow.name,
            action: DiffActionEnum.DELETED,
          });
        }
      }

      return this.createDiffResult(EntityTypeEnum.WORKFLOW, diffs);
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

  private async compareWorkflows(sourceWorkflow: any, targetWorkflow: any): Promise<Record<string, any>> {
    // Get preferences for both workflows
    const [sourcePreferences, targetPreferences] = await Promise.all([
      this.preferencesRepository.find({
        _templateId: sourceWorkflow._id,
        _environmentId: sourceWorkflow._environmentId,
        type: { $in: [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW] },
      }),
      this.preferencesRepository.find({
        _templateId: targetWorkflow._id,
        _environmentId: targetWorkflow._environmentId,
        type: { $in: [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW] },
      }),
    ]);

    // Normalize both workflows using the same logic as sync-to-environment
    const normalizedSource = normalizeWorkflowForComparison(sourceWorkflow, sourcePreferences);
    const normalizedTarget = normalizeWorkflowForComparison(targetWorkflow, targetPreferences);

    // Get differences using deep-object-diff
    const differences = diff(normalizedTarget, normalizedSource);

    // If no differences, return empty object
    if (Object.keys(differences).length === 0) {
      return {};
    }

    // Transform differences to match expected format
    const changes: Record<string, any> = {};

    for (const [field, value] of Object.entries(differences)) {
      // For steps, just report the count change
      if (field === 'steps') {
        changes[field] = {
          old: targetWorkflow.steps?.length || 0,
          new: sourceWorkflow.steps?.length || 0,
        };
      } else {
        changes[field] = {
          old: normalizedTarget[field],
          new: normalizedSource[field],
        };
      }
    }

    return changes;
  }
}
