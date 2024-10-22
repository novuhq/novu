import { Injectable } from '@nestjs/common';

import {
  ControlValuesEntity,
  ControlValuesRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import { ControlValuesLevelEnum, WorkflowResponseDto } from '@novu/shared';
import { GetPreferences, GetPreferencesCommand } from '@novu/application-generic';
import { GetWorkflowCommand } from './get-workflow.command';
import { toResponseWorkflowDto } from '../../mappers/notification-template-mapper';
import { GetWorkflowByIdsUseCase } from '../get-workflow-by-ids/get-workflow-by-ids.usecase';
import { GetWorkflowByIdsCommand } from '../get-workflow-by-ids/get-workflow-by-ids.command';

@Injectable()
export class GetWorkflowUseCase {
  constructor(
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private controlValuesRepository: ControlValuesRepository,
    private getPreferencesUseCase: GetPreferences
  ) {}
  async execute(command: GetWorkflowCommand): Promise<WorkflowResponseDto> {
    const workflowEntity: NotificationTemplateEntity | null = await this.getWorkflowByIdsUseCase.execute(
      GetWorkflowByIdsCommand.create({
        ...command,
        identifierOrInternalId: command.identifierOrInternalId,
      })
    );

    const stepIdToControlValuesMap = await this.getControlsValuesMap(workflowEntity.steps, command, workflowEntity._id);
    const preferences = await this.getPreferencesUseCase.safeExecute(
      GetPreferencesCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
      })
    );

    return toResponseWorkflowDto(workflowEntity, preferences, stepIdToControlValuesMap);
  }

  private async getControlsValuesMap(
    steps: NotificationStepEntity[],
    command: GetWorkflowCommand,
    _workflowId: string
  ): Promise<{ [key: string]: ControlValuesEntity }> {
    const acc: { [key: string]: ControlValuesEntity } = {};

    for (const step of steps) {
      const controlValuesEntity = await this.buildControlValuesForStep(step, command, _workflowId);
      if (controlValuesEntity) {
        acc[step._templateId] = controlValuesEntity;
      }
    }

    return acc;
  }
  private async buildControlValuesForStep(
    step: NotificationStepEntity,
    command: GetWorkflowCommand,
    _workflowId: string
  ): Promise<ControlValuesEntity | null> {
    return await this.controlValuesRepository.findFirst({
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _workflowId,
      _stepId: step._templateId,
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });
  }
}
