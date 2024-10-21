import { Injectable } from '@nestjs/common';

import {
  ControlValuesRepository,
  MessageTemplateRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';

import { DeleteWorkflowCommand } from './delete-workflow.command';
import { GetWorkflowByIdsUseCase } from '../get-workflow-by-ids/get-workflow-by-ids.usecase';
import { GetWorkflowByIdsCommand } from '../get-workflow-by-ids/get-workflow-by-ids.command';

@Injectable()
export class DeleteWorkflowUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private controlValuesRepository: ControlValuesRepository
  ) {}

  async execute(command: DeleteWorkflowCommand): Promise<void> {
    const workflowEntity: NotificationTemplateEntity | null = await this.getWorkflowByIdsUseCase.execute(
      GetWorkflowByIdsCommand.create({
        ...command,
        identifierOrInternalId: command.identifierOrInternalId,
      })
    );

    await this.deleteRelatedEntities(command, workflowEntity);
  }

  private async deleteRelatedEntities(command: DeleteWorkflowCommand, workflow: NotificationTemplateEntity) {
    await this.controlValuesRepository.deleteMany({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _workflowId: workflow._id,
    });
    await this.removeMessageTemplatesIfNeeded(workflow, command);
    await this.notificationTemplateRepository.delete(buildDeleteQuery(command, workflow._id));
  }

  private async removeMessageTemplatesIfNeeded(workflow: NotificationTemplateEntity, command: DeleteWorkflowCommand) {
    if (workflow.steps.length > 0) {
      for (const step of workflow.steps) {
        await this.messageTemplateRepository.deleteById({
          _id: step._templateId,
          _environmentId: command.user.environmentId,
        });
      }
    }
  }
}
function buildDeleteQuery(command: DeleteWorkflowCommand, _workflowId: string) {
  return {
    _id: _workflowId,
    _organizationId: command.user.organizationId,
    _environmentId: command.user.environmentId,
  };
}
