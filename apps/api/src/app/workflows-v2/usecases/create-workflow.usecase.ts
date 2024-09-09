import { BadRequestException, Injectable } from '@nestjs/common';

import {
  NotificationTemplateRepository,
  EnvironmentRepository,
  NotificationGroupRepository,
  NotificationTemplateEntity,
} from '@novu/dal';
import {
  CreateWorkflow as CreateWorkflowGeneric,
  CreateWorkflowCommand as CreateWorkflowGenericCommand,
  NotificationStep,
  UpdateWorkflow,
  UpdateWorkflowCommand,
} from '@novu/application-generic';
import { WorkflowOriginEnum, WorkflowTypeEnum } from '@novu/shared';

import { CreateWorkflowCommand, StepCommand } from './create-workflow.command';
import { CreateWorkflowResponseDto } from '../dto';

@Injectable()
export class CreateWorkflow {
  constructor(
    private createWorkflowGenericUsecase: CreateWorkflowGeneric,
    private updateWorkflowUsecase: UpdateWorkflow,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private environmentRepository: EnvironmentRepository
  ) {}
  async execute(command: CreateWorkflowCommand): Promise<CreateWorkflowResponseDto> {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }

    const createdWorkflow = await this.createWorkflow(command);

    // todo: map to v2 workflow and return it

    return createdWorkflow;
  }

  private async createWorkflow(command: CreateWorkflowCommand) {
    const workflowExist = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.workflowId
    );

    if (workflowExist) {
      return await this.updateWorkflowUsecase.execute(
        UpdateWorkflowCommand.create({
          id: workflowExist._id,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          name: command.workflowId,
          steps: this.mapSteps(command.steps, workflowExist),
          controls: {
            schema: command.controlsSchema?.schema,
          },
          rawData: command,
          payloadSchema: command.payloadSchema?.schema as Record<string, unknown>,
          type: WorkflowTypeEnum.BRIDGE,
          description: command.description,
          tags: command.tags,
          active: command.active ?? true,
          critical: command.options.critical,
          preferenceSettings: command.options.preferenceSettings,
        })
      );
    } else {
      const notificationGroupId = await this.getNotificationGroup(
        command.options?.notificationGroupId,
        command.environmentId
      );
      if (!notificationGroupId) {
        throw new BadRequestException('Notification group not found');
      }
      const isWorkflowActive = command.options?.active ?? true;

      return this.createWorkflowGenericUsecase.execute(
        CreateWorkflowGenericCommand.create({
          notificationGroupId: notificationGroupId,
          draft: !isWorkflowActive,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          name: command.workflowId,
          __source: 'bridge',
          type: WorkflowTypeEnum.BRIDGE,
          origin: command.origin ?? WorkflowOriginEnum.NOVU,
          steps: this.mapSteps(command.steps),
          controls: {
            schema: command.controlsSchema?.schema,
          },
          rawData: command as unknown as Record<string, unknown>,
          payloadSchema: command.payloadSchema?.schema as Record<string, unknown>,
          active: isWorkflowActive,
          description: command.description,
          tags: command.tags,
          critical: command.options?.critical ?? false,
          preferenceSettings: command.options?.preferenceSettings,
        })
      );
    }
  }

  private mapSteps(commandWorkflowSteps: StepCommand[], workflow?: NotificationTemplateEntity | undefined) {
    const steps: NotificationStep[] = commandWorkflowSteps.map((step) => {
      const foundStep = workflow?.steps?.find((workflowStep) => workflowStep.stepId === step.stepId);

      const template = {
        _id: foundStep?._id,
        type: step.type,
        name: step.stepId,
        controls: step.controlSchemas,
        options: step.options,
        code: step.code,
      };

      return {
        template,
        name: step.stepId,
        stepId: step.stepId,
        uuid: step.stepId,
        shouldStopOnFail: step.options?.shouldStopOnFail ?? false,
      };
    });

    return steps;
  }

  private async getNotificationGroup(notificationGroupIdCommand: string | undefined, environmentId: string) {
    let notificationGroupId = notificationGroupIdCommand;

    if (!notificationGroupId) {
      notificationGroupId = (
        await this.notificationGroupRepository.findOne(
          {
            name: 'General',
            _environmentId: environmentId,
          },
          '_id'
        )
      )?._id;
    }

    return notificationGroupId;
  }
}
