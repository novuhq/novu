import { Injectable } from '@nestjs/common';
import { LayoutEntity, NotificationTemplateEntity } from '@novu/dal';
import { DeleteLayoutCommand } from '../../../../layouts-v2/usecases/delete-layout/delete-layout.command';
import { DeleteLayoutUseCase } from '../../../../layouts-v2/usecases/delete-layout/delete-layout.use-case';
import { DeleteWorkflowCommand } from '../../../../workflows-v1/usecases/delete-workflow/delete-workflow.command';
import { DeleteWorkflowUseCase } from '../../../../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { ISyncContext } from '../../../types/sync.types';
import { IBaseDeleteService } from '../base/interfaces/base-delete.interface';

@Injectable()
export class LayoutDeleteAdapter implements IBaseDeleteService<LayoutEntity> {
  constructor(private readonly deleteLayoutUseCase: DeleteLayoutUseCase) {}

  async deleteResourceFromTarget(context: ISyncContext, resource: LayoutEntity): Promise<void> {
    await this.deleteLayoutUseCase.execute(
      DeleteLayoutCommand.create({
        layoutIdOrInternalId: resource._id,
        environmentId: context.targetEnvironmentId,
        organizationId: context.user.organizationId,
        userId: context.user._id,
      })
    );
  }
}
