import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { NotificationTemplateRepository, PreferencesRepository } from '@novu/dal';
import { WorkflowOriginEnum, WorkflowStatusEnum } from '@novu/shared';
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
            const changes = this.compareWorkflows(workflow, targetWorkflow);
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
          const changes = this.compareWorkflows(sourceWorkflow, targetWorkflow);
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

  private compareWorkflows(sourceWorkflow: any, targetWorkflow: any): Record<string, any> {
    const changes: Record<string, any> = {};

    // Compare basic properties
    const fieldsToCompare = ['name', 'description', 'active', 'tags', 'critical'];

    for (const field of fieldsToCompare) {
      if (JSON.stringify(sourceWorkflow[field]) !== JSON.stringify(targetWorkflow[field])) {
        changes[field] = {
          old: targetWorkflow[field],
          new: sourceWorkflow[field],
        };
      }
    }

    // Special handling for preferenceSettings to ignore property order
    if (!this.deepEqual(sourceWorkflow.preferenceSettings, targetWorkflow.preferenceSettings)) {
      changes.preferenceSettings = {
        old: targetWorkflow.preferenceSettings,
        new: sourceWorkflow.preferenceSettings,
      };
    }

    // Compare steps - more detailed comparison
    if (this.compareSteps(sourceWorkflow.steps || [], targetWorkflow.steps || [])) {
      changes.steps = {
        old: targetWorkflow.steps?.length || 0,
        new: sourceWorkflow.steps?.length || 0,
      };
    }

    // Compare triggers - improved logic
    if (this.compareTriggers(sourceWorkflow.triggers || [], targetWorkflow.triggers || [])) {
      changes.triggers = {
        old: targetWorkflow.triggers?.length || 0,
        new: sourceWorkflow.triggers?.length || 0,
      };
    }

    // Compare payload schema
    if (JSON.stringify(sourceWorkflow.payloadSchema) !== JSON.stringify(targetWorkflow.payloadSchema)) {
      changes.payloadSchema = {
        old: targetWorkflow.payloadSchema,
        new: sourceWorkflow.payloadSchema,
      };
    }

    // Compare validatePayload
    if (sourceWorkflow.validatePayload !== targetWorkflow.validatePayload) {
      changes.validatePayload = {
        old: targetWorkflow.validatePayload,
        new: sourceWorkflow.validatePayload,
      };
    }

    return changes;
  }

  private compareSteps(sourceSteps: any[], targetSteps: any[]): boolean {
    if (sourceSteps.length !== targetSteps.length) {
      return true;
    }

    // Create maps for easier comparison by stepId
    const sourceStepMap = new Map(sourceSteps.map((step) => [step.stepId || step._id, step]));
    const targetStepMap = new Map(targetSteps.map((step) => [step.stepId || step._id, step]));

    // Check if all source steps exist in target with same properties
    for (const [stepId, sourceStep] of sourceStepMap) {
      const targetStep = targetStepMap.get(stepId);
      if (!targetStep) {
        return true; // Step missing in target
      }

      // Compare step properties
      const stepFieldsToCompare = ['name', 'active', 'shouldStopOnFail', 'filters'];
      for (const field of stepFieldsToCompare) {
        if (JSON.stringify(sourceStep[field]) !== JSON.stringify(targetStep[field])) {
          return true;
        }
      }

      // Compare template properties if they exist
      if (sourceStep.template && targetStep.template) {
        const templateFieldsToCompare = ['type', 'name', 'content', 'subject', 'title'];
        for (const field of templateFieldsToCompare) {
          if (JSON.stringify(sourceStep.template[field]) !== JSON.stringify(targetStep.template[field])) {
            return true;
          }
        }
      } else if (sourceStep.template !== targetStep.template) {
        return true;
      }
    }

    // Check if target has steps not in source
    for (const stepId of targetStepMap.keys()) {
      if (!sourceStepMap.has(stepId)) {
        return true; // Extra step in target
      }
    }

    return false;
  }

  private compareTriggers(sourceTriggers: any[], targetTriggers: any[]): boolean {
    if (sourceTriggers.length !== targetTriggers.length) {
      return true;
    }

    // Compare triggers by identifier
    const sourceTriggerMap = new Map(sourceTriggers.map((trigger) => [trigger.identifier, trigger]));
    const targetTriggerMap = new Map(targetTriggers.map((trigger) => [trigger.identifier, trigger]));

    for (const [identifier, sourceTrigger] of sourceTriggerMap) {
      const targetTrigger = targetTriggerMap.get(identifier);
      if (!targetTrigger) {
        return true; // Trigger missing in target
      }

      // Compare trigger properties that matter for sync
      const triggerFieldsToCompare = ['type', 'variables', 'subscriberVariables', 'reservedVariables'];
      for (const field of triggerFieldsToCompare) {
        const sourceValue = sourceTrigger[field];
        const targetValue = targetTrigger[field];

        // Handle undefined/null values properly
        if (sourceValue !== targetValue) {
          // For array fields like variables, subscriberVariables, reservedVariables
          // we need to compare content ignoring database-generated _id fields
          if (sourceValue || targetValue) {
            if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
              // Compare arrays ignoring _id fields
              if (!this.compareArraysIgnoringIds(sourceValue, targetValue)) {
                return true;
              }
            } else if (JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
              return true;
            }
          }
        }
      }
    }

    // Check if target has triggers not in source
    for (const identifier of targetTriggerMap.keys()) {
      if (!sourceTriggerMap.has(identifier)) {
        return true; // Extra trigger in target
      }
    }

    return false;
  }

  private compareArraysIgnoringIds(sourceArray: any[], targetArray: any[]): boolean {
    if (sourceArray.length !== targetArray.length) {
      return false;
    }

    // Sort both arrays by name (or other stable field) for comparison
    const sortedSource = [...sourceArray].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const sortedTarget = [...targetArray].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    for (let i = 0; i < sortedSource.length; i++) {
      const sourceItem = sortedSource[i];
      const targetItem = sortedTarget[i];

      // Compare all fields except _id
      const sourceItemWithoutId = { ...sourceItem };
      const targetItemWithoutId = { ...targetItem };
      delete sourceItemWithoutId._id;
      delete targetItemWithoutId._id;

      if (JSON.stringify(sourceItemWithoutId) !== JSON.stringify(targetItemWithoutId)) {
        return false;
      }
    }

    return true;
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) {
      return true;
    }

    if (obj1 == null || obj2 == null) {
      return obj1 === obj2;
    }

    if (typeof obj1 !== typeof obj2) {
      return false;
    }

    if (typeof obj1 !== 'object') {
      return obj1 === obj2;
    }

    if (Array.isArray(obj1) !== Array.isArray(obj2)) {
      return false;
    }

    if (Array.isArray(obj1)) {
      if (obj1.length !== obj2.length) {
        return false;
      }
      for (let i = 0; i < obj1.length; i++) {
        if (!this.deepEqual(obj1[i], obj2[i])) {
          return false;
        }
      }
      return true;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (!keys2.includes(key)) {
        return false;
      }
      if (!this.deepEqual(obj1[key], obj2[key])) {
        return false;
      }
    }

    return true;
  }
}
