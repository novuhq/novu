import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import { DeleteWorkflowCommand } from '../../../../workflows-v1/usecases/delete-workflow/delete-workflow.command';
import { DeleteWorkflowUseCase } from '../../../../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { ISyncContext } from '../../../types/sync.types';
import { IBaseDeleteService } from '../base/interfaces/base-delete.interface';

@Injectable()
export class WorkflowDeleteAdapter implements IBaseDeleteService<NotificationTemplateEntity> {
  constructor(private readonly deleteWorkflowUseCase: DeleteWorkflowUseCase) {}

  async deleteResourceFromTarget(context: ISyncContext, resource: NotificationTemplateEntity): Promise<void> {
    await this.deleteWorkflowUseCase.execute(
      DeleteWorkflowCommand.create({
        workflowIdOrInternalId: resource._id,
        environmentId: context.targetEnvironmentId,
        organizationId: context.user.organizationId,
        userId: context.user._id,
      })
    );
  }
}
