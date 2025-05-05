import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';

import { GetWorkflowByIdsCommand } from './get-workflow-by-ids.command';
import { InstrumentUsecase } from '../../../instrumentation';

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
        command.environmentId
      );
    } else {
      workflowEntity = await this.notificationTemplateRepository.findByTriggerIdentifier(
        command.environmentId,
        command.workflowIdOrInternalId
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
