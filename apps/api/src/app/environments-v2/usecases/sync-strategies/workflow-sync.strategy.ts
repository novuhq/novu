import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { BaseSyncStrategy } from './base-sync.strategy';
import { ResourceTypeEnum, ISyncContext, ISyncResult, IDiffResult } from '../../types/sync.types';
import { WorkflowSyncOperation } from './workflow/operations/workflow-sync.operation';
import { WorkflowDiffOperation } from './workflow/operations/workflow-diff.operation';

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
    userContext: UserSessionData
  ): Promise<IDiffResult[]> {
    return this.workflowDiffOperation.execute(sourceEnvId, targetEnvId, organizationId, userContext);
  }
}
