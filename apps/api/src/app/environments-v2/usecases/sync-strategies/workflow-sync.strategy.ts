import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { WorkflowDataContainer } from '../../../shared/containers/workflow-data.container';
import { IDiffResult, ISyncContext, ISyncResult, ResourceTypeEnum } from '../../types/sync.types';
import { BaseSyncStrategy } from './base/base-sync.strategy';
import { WorkflowDiffOperation } from './operations/workflow-diff.operation';
import { WorkflowSyncOperation } from './operations/workflow-sync.operation';

@Injectable()
export class WorkflowSyncStrategy extends BaseSyncStrategy {
  constructor(
    logger: PinoLogger,
    private workflowSyncOperation: WorkflowSyncOperation,
    private workflowDiffOperation: WorkflowDiffOperation
  ) {
    super(logger);
  }

  getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.WORKFLOW;
  }

  async execute(context: ISyncContext): Promise<ISyncResult> {
    return this.workflowSyncOperation.execute(context);
  }

  async diff(
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    userContext: UserSessionData,
    workflowDataContainer?: WorkflowDataContainer
  ): Promise<IDiffResult[]> {
    if (!workflowDataContainer) {
      throw new Error('WorkflowDataContainer is required for workflow diff operations');
    }

    return this.workflowDiffOperation.execute(
      sourceEnvId,
      targetEnvId,
      organizationId,
      userContext,
      workflowDataContainer
    );
  }

  async getAvailableResourceIds(sourceEnvironmentId: string, organizationId: string): Promise<string[]> {
    return this.workflowSyncOperation.getAvailableResourceIds(sourceEnvironmentId, organizationId);
  }
}
