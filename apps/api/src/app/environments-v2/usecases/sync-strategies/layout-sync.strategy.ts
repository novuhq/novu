import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { BaseSyncStrategy } from './base/base-sync.strategy';
import { ResourceTypeEnum, ISyncContext, ISyncResult, IDiffResult } from '../../types/sync.types';
import { LayoutSyncOperation } from './operations/layout-sync.operation';
import { LayoutDiffOperation } from './operations/layout-diff.operation';

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
}
