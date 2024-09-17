import { BadRequestException, Injectable } from '@nestjs/common';
import _ from 'lodash';
import defaults from 'json-schema-defaults';

import {
  ControlVariablesEntity,
  ControlVariablesRepository,
  EnvironmentRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import { Schema } from '@novu/framework';
import { ControlVariablesLevelEnum } from '@novu/shared';

import { GetWorkflowCommand } from './get-workflow.command';
import { WorkflowResponseDto } from '../../dto/workflow.dto';
import { WorkflowTemplateGetMapper } from '../../mappers/workflow-template-get-mapper';

@Injectable()
export class GetWorkflowUseCase {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository,
    private controlVariablesRepository: ControlVariablesRepository
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

    const workflow = WorkflowTemplateGetMapper.toResponseWorkflowDto(notificationTemplateEntity);
    const updatedWorkflow = await this.setStepsControlValues(workflow, command);

    return updatedWorkflow;
  }

  private async setStepsControlValues(
    workflow: WorkflowResponseDto,
    command: GetWorkflowCommand
  ): Promise<WorkflowResponseDto> {
    const updatedWorkflow = { ...workflow };

    updatedWorkflow.steps = await Promise.all(
      workflow.steps.map(async (step) => {
        const defaultSchema = GetStepControlSchemaUsecase();
        const defaultControlValues = defaults(defaultSchema);

        const stepControlsVariables = await this.controlVariablesRepository.findOne({
          _environmentId: command.user.environmentId,
          _organizationId: command.user.organizationId,
          _workflowId: workflow._id,
          stepId: step.stepId,
          level: ControlVariablesLevelEnum.STEP_CONTROLS,
        });

        if (this.isContainControls(stepControlsVariables)) {
          return { ...step, controlValues: { ...defaultControlValues, ...stepControlsVariables.controls } };
        }

        return { ...step, controlValues: defaultControlValues };
      })
    );

    return updatedWorkflow;
  }

  private isContainControls(
    stepControlsVariables: ControlVariablesEntity | null
  ): stepControlsVariables is ControlVariablesEntity & { controls: Record<string, unknown> } {
    if (!stepControlsVariables?.controls) {
      return false;
    }

    return Object.keys(stepControlsVariables?.controls).length > 0;
  }

  private async validateEnvironment(command: GetWorkflowCommand) {
    const environment = await this.environmentRepository.findOne({ _id: command.user.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }
  }
}

const GetStepControlSchemaUsecase = () => {
  // tmp solution, will be replaced with the dynamic control schema once PR 6482 is merged
  const emailOutputSchema = {
    type: 'object',
    properties: {
      subject: { type: 'string', default: 'Hello' },
      body: { type: 'string', default: 'World' },
    },
    required: ['subject', 'body'],
    additionalProperties: false,
  } as const satisfies Schema;

  return emailOutputSchema;
};
