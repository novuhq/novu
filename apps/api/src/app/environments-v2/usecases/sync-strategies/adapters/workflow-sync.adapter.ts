import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import { SyncToEnvironmentCommand } from '../../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.command';
import { SyncToEnvironmentUseCase } from '../../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.usecase';
import { ISyncContext } from '../../../types/sync.types';
import { IBaseSyncService } from '../base/interfaces/base-sync.interface';

@Injectable()
export class WorkflowSyncAdapter implements IBaseSyncService<NotificationTemplateEntity> {
  constructor(private readonly syncToEnvironmentUseCase: SyncToEnvironmentUseCase) {}

  async syncResourceToTarget(context: ISyncContext, resource: NotificationTemplateEntity): Promise<void> {
    await this.syncToEnvironmentUseCase.execute(
      SyncToEnvironmentCommand.create({
        user: { ...context.user, environmentId: context.sourceEnvironmentId },
        workflowIdOrInternalId: resource._id,
        targetEnvironmentId: context.targetEnvironmentId,
        session: context.session,
      })
    );
  }
}
