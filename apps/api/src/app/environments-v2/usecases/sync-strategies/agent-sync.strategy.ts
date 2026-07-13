import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';

import { IDiffResult, ISyncContext, ISyncResult, ResourceTypeEnum } from '../../types/sync.types';
import { BaseSyncStrategy } from './base/base-sync.strategy';
import { AgentDiffOperation } from './operations/agent-diff.operation';
import { AgentSyncOperation } from './operations/agent-sync.operation';

@Injectable()
export class AgentSyncStrategy extends BaseSyncStrategy {
  constructor(
    logger: PinoLogger,
    private agentSyncOperation: AgentSyncOperation,
    private agentDiffOperation: AgentDiffOperation
  ) {
    super(logger);
  }

  getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.AGENT;
  }

  async execute(context: ISyncContext): Promise<ISyncResult> {
    return this.agentSyncOperation.execute(context);
  }

  async diff(
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    userContext: UserSessionData
  ): Promise<IDiffResult[]> {
    return this.agentDiffOperation.execute(sourceEnvId, targetEnvId, organizationId, userContext);
  }

  async getAvailableResourceIds(sourceEnvironmentId: string, organizationId: string): Promise<string[]> {
    return this.agentSyncOperation.getAvailableResourceIds(sourceEnvironmentId, organizationId);
  }
}
