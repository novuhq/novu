import { Injectable } from '@nestjs/common';
import { LayoutEntity } from '@novu/dal';
import {
  LayoutSyncToEnvironmentCommand,
  LayoutSyncToEnvironmentUseCase,
} from '../../../../layouts-v2/usecases/sync-to-environment';
import { ISyncContext } from '../../../types/sync.types';
import { IBaseSyncService } from '../base/interfaces/base-sync.interface';

@Injectable()
export class LayoutSyncAdapter implements IBaseSyncService<LayoutEntity> {
  constructor(private readonly layoutSyncToEnvironmentUseCase: LayoutSyncToEnvironmentUseCase) {}

  async syncResourceToTarget(context: ISyncContext, resource: LayoutEntity): Promise<void> {
    await this.layoutSyncToEnvironmentUseCase.execute(
      LayoutSyncToEnvironmentCommand.create({
        user: { ...context.user, environmentId: context.sourceEnvironmentId },
        layoutIdOrInternalId: resource._id,
        targetEnvironmentId: context.targetEnvironmentId,
      })
    );
  }
}
