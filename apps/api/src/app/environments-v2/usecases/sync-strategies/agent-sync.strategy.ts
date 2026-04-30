import { Injectable } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { FeatureFlagsKeysEnum, UserSessionData } from '@novu/shared';

import { IDiffResult, ISyncContext, ISyncResult, ResourceTypeEnum } from '../../types/sync.types';
import { BaseSyncStrategy } from './base/base-sync.strategy';
import { AgentDiffOperation } from './operations/agent-diff.operation';
import { AgentSyncOperation } from './operations/agent-sync.operation';

@Injectable()
export class AgentSyncStrategy extends BaseSyncStrategy {
  constructor(
    logger: PinoLogger,
    private agentSyncOperation: AgentSyncOperation,
    private agentDiffOperation: AgentDiffOperation,
    private featureFlagsService: FeatureFlagsService
  ) {
    super(logger);
  }

  getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.AGENT;
  }

  async execute(context: ISyncContext): Promise<ISyncResult> {
    const isEnabled = await this.isFeatureEnabled(context.user.organizationId, context.sourceEnvironmentId);

    if (!isEnabled) {
      return { resourceType: ResourceTypeEnum.AGENT, successful: [], failed: [], skipped: [], totalProcessed: 0 };
    }

    return this.agentSyncOperation.execute(context);
  }

  async diff(
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    userContext: UserSessionData
  ): Promise<IDiffResult[]> {
    const isEnabled = await this.isFeatureEnabled(organizationId, sourceEnvId);

    if (!isEnabled) {
      return [];
    }

    return this.agentDiffOperation.execute(sourceEnvId, targetEnvId, organizationId, userContext);
  }

  async getAvailableResourceIds(sourceEnvironmentId: string, organizationId: string): Promise<string[]> {
    const isEnabled = await this.isFeatureEnabled(organizationId, sourceEnvironmentId);

    if (!isEnabled) {
      return [];
    }

    return this.agentSyncOperation.getAvailableResourceIds(sourceEnvironmentId, organizationId);
  }

  private async isFeatureEnabled(organizationId: string, environmentId: string): Promise<boolean> {
    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
      environment: { _id: environmentId },
    });
  }
}
