import { BadRequestException, Injectable } from '@nestjs/common';

import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';
import { DeleteWorkflowCommand } from './delete-workflow.command';

@Injectable()
export class DeleteWorkflowUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository
  ) {}
  async execute(command: DeleteWorkflowCommand): Promise<void> {
    await this.validateEnvironment(command);
    const deleteQuery = buildDeleteQuery(command);
    await this.notificationTemplateRepository.delete(deleteQuery);
  }

  private async validateEnvironment(command: DeleteWorkflowCommand) {
    const environment = await this.environmentRepository.findOne({ _id: command.user.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
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
