import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { IDiffResult, ISyncContext, ISyncResult, ResourceTypeEnum } from '../../types/sync.types';
import { BaseSyncStrategy } from './base/base-sync.strategy';
import { LayoutDiffOperation } from './operations/layout-diff.operation';
import { LayoutSyncOperation } from './operations/layout-sync.operation';

@Injectable()
export class LayoutSyncStrategy extends BaseSyncStrategy {
  constructor(
    logger: PinoLogger,
    private layoutSyncOperation: LayoutSyncOperation,
    private layoutDiffOperation: LayoutDiffOperation
  ) {
    super(logger);
  }

  getResourceType(): ResourceTypeEnum {
    return ResourceTypeEnum.LAYOUT;
  }

  async execute(context: ISyncContext): Promise<ISyncResult> {
    return this.layoutSyncOperation.execute(context);
  }

  async diff(
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    userContext: UserSessionData
  ): Promise<IDiffResult[]> {
    return this.layoutDiffOperation.execute(sourceEnvId, targetEnvId, organizationId, userContext);
  }

  async getAvailableResourceIds(sourceEnvironmentId: string, organizationId: string): Promise<string[]> {
    return this.layoutSyncOperation.getAvailableResourceIds(sourceEnvironmentId, organizationId);
  }
}
