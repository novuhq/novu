import { Injectable } from '@nestjs/common';

import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';

import { GetWorkflowByIdsCommand } from './get-workflow-by-ids.command';
import { WorkflowNotFoundException } from '../../exceptions/workflow-not-found-exception';

@Injectable()
export class GetWorkflowByIdsUseCase {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}
  async execute(command: GetWorkflowByIdsCommand): Promise<NotificationTemplateEntity> {
    const isInternalId = NotificationTemplateRepository.isInternalId(command.identifierOrInternalId);

    let workflowEntity: NotificationTemplateEntity | null;

    if (isInternalId) {
      workflowEntity = await this.notificationTemplateRepository.findById(
        command.identifierOrInternalId,
        command.user.environmentId
      );
    } else {
      workflowEntity = await this.notificationTemplateRepository.findByTriggerIdentifier(
        command.user.environmentId,
        command.identifierOrInternalId
      );
    }

    if (!workflowEntity) {
      throw new WorkflowNotFoundException(command.identifierOrInternalId);
    }

    return workflowEntity;
  }
}
