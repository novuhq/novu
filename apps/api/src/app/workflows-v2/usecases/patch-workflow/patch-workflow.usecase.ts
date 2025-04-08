import { Injectable } from '@nestjs/common';
import { UserSessionData, WorkflowResponseDto, WorkflowStatusEnum } from '@novu/shared';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { GetWorkflowWithPreferencesUseCase, WorkflowWithPreferencesResponseDto } from '@novu/application-generic';
import { PatchWorkflowCommand } from './patch-workflow.command';
import { GetWorkflowUseCase } from '../get-workflow';

@Injectable()
export class PatchWorkflowUsecase {
  constructor(
    private getWorkflowWithPreferencesUseCase: GetWorkflowWithPreferencesUseCase,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private getWorkflowUseCase: GetWorkflowUseCase
  ) {}

  async execute(command: PatchWorkflowCommand): Promise<WorkflowResponseDto> {
    const persistedWorkflow = await this.fetchWorkflow(command);
    const transientWorkflow = this.patchWorkflowFields(persistedWorkflow, command);
    await this.persistWorkflow(transientWorkflow, command.user);

    return await this.getWorkflowUseCase.execute({
      workflowIdOrInternalId: command.workflowIdOrInternalId,
      user: command.user,
    });
  }

  private patchWorkflowFields(
    persistedWorkflow: NotificationTemplateEntity,
    command: PatchWorkflowCommand
  ): NotificationTemplateEntity {
    const transientWorkflow = { ...persistedWorkflow };
    if (command.active !== undefined && command.active !== null) {
      transientWorkflow.active = command.active;
    }

    if (command.name !== undefined && command.name !== null) {
      transientWorkflow.name = command.name;
    }

    if (command.description !== undefined && command.description !== null) {
      transientWorkflow.description = command.description;
    }

    if (command.tags !== undefined && command.tags !== null) {
      transientWorkflow.tags = command.tags;
    }

    if (command.active !== undefined && command.active !== null) {
      transientWorkflow.status = command.active ? WorkflowStatusEnum.ACTIVE : WorkflowStatusEnum.INACTIVE;
    }

    return transientWorkflow;
  }

  private async persistWorkflow(workflowWithIssues: NotificationTemplateEntity, userSessionData: UserSessionData) {
    await this.notificationTemplateRepository.update(
      {
        _id: workflowWithIssues._id,
        _environmentId: userSessionData.environmentId,
      },
      {
        ...workflowWithIssues,
      }
    );
  }

  private async fetchWorkflow(command: PatchWorkflowCommand): Promise<WorkflowWithPreferencesResponseDto> {
    return await this.getWorkflowWithPreferencesUseCase.execute({
      workflowIdOrInternalId: command.workflowIdOrInternalId,
      environmentId: command.user.environmentId,
      organizationId: command.user.organizationId,
    });
  }
}
