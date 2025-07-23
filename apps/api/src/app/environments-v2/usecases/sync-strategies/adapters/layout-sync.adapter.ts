import { Injectable } from '@nestjs/common';
import { LayoutEntity } from '@novu/dal';
import { IBaseSyncService } from '../base/interfaces/base-sync.interface';
import { ISyncContext } from '../../../types/sync.types';
import {
  LayoutSyncToEnvironmentCommand,
  LayoutSyncToEnvironmentUseCase,
} from '../../../../layouts-v2/usecases/sync-to-environment';

@Injectable()
export class LayoutSyncAdapter implements IBaseSyncService<LayoutEntity> {
  constructor(private readonly syncToEnvironmentUseCase: LayoutSyncToEnvironmentUseCase) {}

  async syncResourceToTarget(context: ISyncContext, resource: LayoutEntity): Promise<void> {
    await this.syncToEnvironmentUseCase.execute(
      LayoutSyncToEnvironmentCommand.create({
        user: { ...context.user, environmentId: context.sourceEnvironmentId },
        layoutIdOrInternalId: resource._id,
        targetEnvironmentId: context.targetEnvironmentId,
      })
    );
  }
}
