import { BadRequestException, Injectable } from '@nestjs/common';

import { EnvironmentRepository, NotificationTemplateRepository } from '@novu/dal';

import { GetWorkflowCommand } from './get-workflow.command';
import { WorkflowResponseDto } from '../../dto/workflow.dto';
import { WorkflowTemplateGetMapper } from '../../mappers/workflow-template-get-mapper';

@Injectable()
export class GetWorkflowUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository
  ) {}
  async execute(command: GetWorkflowCommand): Promise<WorkflowResponseDto> {
    await this.validateEnvironment(command);
    const notificationTemplateEntity = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.user.environmentId,
      command.workflowId
    );
    if (notificationTemplateEntity === null || notificationTemplateEntity === undefined) {
      throw new BadRequestException(`Workflow not found with id: ${command.workflowId}`);
    }

    return WorkflowTemplateGetMapper.toResponseWorkflowDto(notificationTemplateEntity);
  }

  private async validateEnvironment(command: GetWorkflowCommand) {
    const environment = await this.environmentRepository.findOne({ _id: command.user.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }
  }
}
