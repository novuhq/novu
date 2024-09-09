import { Injectable, Logger } from '@nestjs/common';

import {
  ControlValuesEntity,
  ControlValuesRepository,
  NotificationStepEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import { ControlVariablesLevelEnum } from '@novu/shared';
import { GetPreferences, GetPreferencesCommand, GetPreferencesResponseDto } from '@novu/application-generic';

import { GetWorkflowCommand } from './get-workflow.command';
import { NotificationTemplateMapper } from '../../mappers/notification-template-mapper';
import { WorkflowNotFoundException } from '../../exceptions/workflow-not-found-exception';
import { WorkflowResponseDto } from '../../dto/workflow-response-dto';

@Injectable()
export class GetWorkflowUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private controlValuesRepository: ControlValuesRepository,
    private getPreferencesUseCase: GetPreferences
  ) {}
  async execute(command: GetWorkflowCommand): Promise<WorkflowResponseDto> {
    const notificationTemplateEntity = await this.notificationTemplateRepository.findByIdQuery({
      id: command._workflowId,
      environmentId: command.user.environmentId,
    });

    if (!notificationTemplateEntity) {
      throw new WorkflowNotFoundException(command._workflowId);
    }
    const stepIdToControlValuesMap = await this.getControlsValuesMap(notificationTemplateEntity.steps, command);
    const preferences = await this.getPreferencesForWorkflow(command);

    return NotificationTemplateMapper.toResponseWorkflowDto(
      notificationTemplateEntity,
      preferences,
      stepIdToControlValuesMap
    );
  }

  private async getPreferencesForWorkflow(
    getWorkflowCommand: GetWorkflowCommand
  ): Promise<GetPreferencesResponseDto | undefined> {
    const command = {
      environmentId: getWorkflowCommand.user.environmentId,
      organizationId: getWorkflowCommand.user.organizationId,
      templateId: getWorkflowCommand._workflowId,
    } as GetPreferencesCommand;

    try {
      const workflowPreferences = await this.getPreferencesUseCase.execute(GetPreferencesCommand.create(command));

      return workflowPreferences;
    } catch (e) {
      Logger.error('Error getting preferences for workflow', e);

      return undefined;
    }
  }

  private async getControlsValuesMap(
    steps: NotificationStepEntity[],
    command: GetWorkflowCommand
  ): Promise<{ [key: string]: ControlValuesEntity }> {
    const acc: { [key: string]: ControlValuesEntity } = {};

    for (const step of steps) {
      const controlValuesEntity = await this.buildControlValuesForStep(step, command);
      if (controlValuesEntity) {
        acc[step._templateId] = controlValuesEntity;
      }
    }

    return acc;
  }
  private async buildControlValuesForStep(
    step: NotificationStepEntity,
    command: GetWorkflowCommand
  ): Promise<ControlValuesEntity | null> {
    return await this.controlValuesRepository.findFirst({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _workflowId: command._workflowId,
      _stepId: step._templateId,
      level: ControlVariablesLevelEnum.STEP_CONTROLS,
    });
  }
}
