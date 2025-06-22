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

      for (const workflow of sourceWorkflows) {
        try {
          const syncStart = Date.now();

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
            action: 'updated', // We'll determine this more precisely later
            duration: Date.now() - syncStart,
          });

          this.logger.info(`Successfully synced workflow: ${workflow.name}`);
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
    const fieldsToCompare = ['name', 'description', 'active', 'tags'];

    for (const field of fieldsToCompare) {
      if (JSON.stringify(sourceWorkflow[field]) !== JSON.stringify(targetWorkflow[field])) {
        changes[field] = {
          old: targetWorkflow[field],
          new: sourceWorkflow[field],
        };
      }
    }

    // Compare steps (simplified comparison)
    if (sourceWorkflow.steps?.length !== targetWorkflow.steps?.length) {
      changes.steps = {
        old: targetWorkflow.steps?.length || 0,
        new: sourceWorkflow.steps?.length || 0,
      };
    }

    return changes;
  }
}
