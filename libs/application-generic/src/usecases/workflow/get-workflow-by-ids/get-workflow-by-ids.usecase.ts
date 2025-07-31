import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { InstrumentUsecase } from '../../../instrumentation';
import { GetWorkflowByIdsCommand } from './get-workflow-by-ids.command';

@Injectable()
export class GetWorkflowByIdsUseCase {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  @InstrumentUsecase()
  async execute(command: GetWorkflowByIdsCommand): Promise<NotificationTemplateEntity> {
    const isInternalId = NotificationTemplateRepository.isInternalId(command.workflowIdOrInternalId);

    let workflowEntity: NotificationTemplateEntity;
    if (isInternalId) {
      workflowEntity = await this.notificationTemplateRepository.findById(
        command.workflowIdOrInternalId,
        command.environmentId,
        command.session
      );
    } else {
      workflowEntity = await this.notificationTemplateRepository.findByTriggerIdentifier(
        command.environmentId,
        command.workflowIdOrInternalId,
        command.session
      );
    }

    if (!workflowEntity) {
      throw new NotFoundException({
        message: 'Workflow cannot be found',
        workflowId: command.workflowIdOrInternalId,
      });
    }

    return workflowEntity;
  }
}
