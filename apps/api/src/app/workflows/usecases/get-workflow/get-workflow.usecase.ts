import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { GetWorkflowCommand } from './get-workflow.command';

@Injectable()
export class GetWorkflow {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async execute(command: GetWorkflowCommand): Promise<NotificationTemplateEntity> {
    const workflow = await this.notificationTemplateRepository.findById(command.workflowId, command.environmentId);
    if (!workflow) {
      throw new NotFoundException(`Workflow with id ${command.workflowId} not found`);
    }

    return workflow;
  }
}
