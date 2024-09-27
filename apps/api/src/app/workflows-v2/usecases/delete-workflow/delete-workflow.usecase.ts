import { Injectable } from '@nestjs/common';

import {
  ControlValuesRepository,
  MessageTemplateRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';

import { DeleteWorkflowCommand } from './delete-workflow.command';
import { WorkflowNotFoundException } from '../../exceptions/workflow-not-found-exception';

@Injectable()
export class DeleteWorkflowUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private controlValuesRepository: ControlValuesRepository
  ) {}

  async execute(command: DeleteWorkflowCommand): Promise<void> {
    const workflow = await this.notificationTemplateRepository.findByIdQuery({
      id: command.workflowId,
      environmentId: command.user.environmentId,
    });
    if (!workflow) {
      throw new WorkflowNotFoundException(command.workflowId);
    }
    await this.deleteRelatedEntities(command, workflow);
  }

  private async deleteRelatedEntities(command: DeleteWorkflowCommand, workflow) {
    await this.controlValuesRepository.deleteMany({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _workflowId: command.workflowId,
    });
    await this.removeMessageTemplatesIfNeeded(workflow, command);
    await this.notificationTemplateRepository.delete(buildDeleteQuery(command));
  }

  private async removeMessageTemplatesIfNeeded(workflow: NotificationTemplateEntity, command: DeleteWorkflowCommand) {
    if (workflow.steps.length > 0) {
      await this.messageTemplateRepository.deleteById({
        _id: command.workflowId,
        _environmentId: command.user.environmentId,
      });
    }
  }
}

function buildDeleteQuery(command: DeleteWorkflowCommand) {
  return {
    _id: command.workflowId,
    _organizationId: command.user.organizationId,
    _environmentId: command.user.environmentId,
  };
}
