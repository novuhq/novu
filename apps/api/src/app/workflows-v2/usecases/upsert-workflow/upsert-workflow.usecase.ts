import { BadRequestException, Injectable } from '@nestjs/common';

import {
  EnvironmentRepository,
  NotificationGroupRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  CreateWorkflow as CreateWorkflowGeneric,
  CreateWorkflowCommand,
  NotificationStep,
  UpdateWorkflow,
  UpdateWorkflowCommand,
  UpsertControlVariablesCommand,
  UpsertControlVariablesUseCase,
  UpsertPreferences,
  UpsertWorkflowPreferencesCommand,
} from '@novu/application-generic';
import { IPreferenceChannels, WorkflowTypeEnum } from '@novu/shared';
import { DiscoverWorkflowOutputPreferences } from '@novu/framework';

import { UpsertWorkflowCommand } from './upsert-workflow.command';
import { StepDto, WorkflowResponseDto } from '../../dto/workflow.dto';
import { WorkflowTemplateGetMapper } from '../../mappers/workflow-template-get-mapper';

@Injectable()
export class UpsertWorkflowUseCase {
  constructor(
    private createWorkflowGenericUsecase: CreateWorkflowGeneric,
    private updateWorkflowUsecase: UpdateWorkflow,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private upsertPreferencesUsecase: UpsertPreferences,
    private upsertControlVariables: UpsertControlVariablesUseCase,
    private environmentRepository: EnvironmentRepository
  ) {}
  async execute(command: UpsertWorkflowCommand): Promise<WorkflowResponseDto> {
    await this.validateEnvironment(command);
    const existingWorkflow = await this.getWorkflowIfExist(command);
    const workflow = await this.createOrUpdateWorkflow(existingWorkflow, command);
    await this.upsertPreference(command, workflow);
    await this.upsertControlValues(workflow, command);

    return WorkflowTemplateGetMapper.toResponseWorkflowDto(workflow);
  }

  private async upsertControlValues(workflow: NotificationTemplateEntity, command: UpsertWorkflowCommand) {
    for (const upsertedStep of workflow.steps) {
      // should not happen as it was created in the createWorkflowGenericUsecase
      if (!upsertedStep._id || !upsertedStep.stepId) {
        continue;
      }

      const commandStep = command.workflowDto?.steps.find(
        (commandStepItem) => commandStepItem.stepId === upsertedStep.stepId
      );

      if (!commandStep) {
        continue;
      }

      await this.upsertControlVariables.execute(
        UpsertControlVariablesCommand.create({
          organizationId: command.user.organizationId,
          environmentId: command.user.environmentId,
          _workflowId: workflow._id,
          workflowId: command.workflowDto.workflowId,
          _stepId: upsertedStep._id,
          stepId: upsertedStep.stepId,
          controlValues: commandStep.controlValues || {},
          defaultControls: commandStep?.controls || { schema: {} },
        })
      );
    }
  }

  private async upsertPreference(command: UpsertWorkflowCommand, workflow: NotificationTemplateEntity) {
    if (command.workflowDto.preferences) {
      await this.upsertPreferencesUsecase.upsertWorkflowPreferences(
        UpsertWorkflowPreferencesCommand.create({
          environmentId: workflow._environmentId,
          organizationId: workflow._organizationId,
          templateId: workflow._id,
          preferences: command.workflowDto.preferences,
        })
      );
    }
  }

  private async createOrUpdateWorkflow(
    existingWorkflow: NotificationTemplateEntity | null,
    command: UpsertWorkflowCommand
  ): Promise<NotificationTemplateEntity> {
    if (existingWorkflow) {
      return await this.updateWorkflowUsecase.execute(
        UpdateWorkflowCommand.create(this.convertCreateToUpdateCommand(command, existingWorkflow))
      );
    }
    const notificationGroupId = await this.getNotificationGroup(
      command.workflowDto.notificationGroupId,
      command.user.environmentId
    );
    if (!notificationGroupId) {
      throw new BadRequestException('Notification group not found');
    }

    return await this.createWorkflowGenericUsecase.execute(
      CreateWorkflowCommand.create(this.buildCreateWorkflowGenericCommand(notificationGroupId, command))
    );
  }

  private async validateEnvironment(command: UpsertWorkflowCommand) {
    const environment = await this.environmentRepository.findOne({ _id: command.user.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }
  }

  private buildCreateWorkflowGenericCommand(
    notificationGroupId: string,
    command: UpsertWorkflowCommand
  ): CreateWorkflowCommand {
    const { user } = command;
    const { workflowDto } = command;
    const isWorkflowActive = command.workflowDto?.active ?? true;

    return {
      notificationGroupId,
      draft: !isWorkflowActive,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      userId: user._id,
      name: command.workflowDto.workflowId || command.workflowDto.name,
      __source: 'bridge',
      type: WorkflowTypeEnum.BRIDGE,
      origin: workflowDto.origin,
      steps: this.mapSteps(workflowDto.steps),
      controls: workflowDto.controls,
      rawData: command as unknown as Record<string, unknown>,
      payloadSchema: {},
      active: isWorkflowActive,
      description: workflowDto.description || 'Missing Description',
      tags: workflowDto.tags || [],
      critical: workflowDto.critical ?? false,
      preferenceSettings: this.buildPreferencesForEntity(workflowDto.preferences),
    };
  }

  // Function to map WorkflowPreferencesDto to IPreferenceChannels
  private buildPreferencesForEntity(preferences: DiscoverWorkflowOutputPreferences): IPreferenceChannels {
    const channels: IPreferenceChannels = {};
    // eslint-disable-next-line guard-for-in
    for (const channel in preferences.channels) {
      if (preferences.channels.hasOwnProperty(channel)) {
        channels[channel] = preferences.channels[channel].defaultValue;
        continue;
      }
      const { workflow } = preferences;
      channels[channel] = workflow.defaultValue;
    }

    return channels;
  }

  private async getWorkflowIfExist(upsertCommand: UpsertWorkflowCommand) {
    if (!upsertCommand._id) {
      return null;
    }

    return await this.notificationTemplateRepository.findByTriggerIdentifier(
      upsertCommand.user.environmentId,
      upsertCommand._id
    );
  }

  private convertCreateToUpdateCommand(
    command: UpsertWorkflowCommand,
    existingWorkflow: NotificationTemplateEntity
  ): UpdateWorkflowCommand {
    const { workflowDto } = command;
    const { user } = command;

    return {
      id: existingWorkflow._id,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      userId: user._id,
      name: command.workflowDto.workflowId,
      steps: this.mapSteps(workflowDto.steps),
      controls: workflowDto.controls,
      rawData: workflowDto,
      payloadSchema: workflowDto.payload?.schema,
      type: WorkflowTypeEnum.BRIDGE,
      description: workflowDto.description,
      tags: workflowDto.tags,
      active: workflowDto.active ?? true,
      critical: workflowDto.critical,
      preferenceSettings: this.buildPreferencesForEntity(workflowDto.preferences),
    };
  }

  private mapSteps(commandWorkflowSteps: Array<StepDto>, workflow?: NotificationTemplateEntity | undefined) {
    const steps: NotificationStep[] = commandWorkflowSteps.map((step) => {
      const foundStep = workflow?.steps?.find((workflowStep) => workflowStep.stepId === step.stepId);

      const template = {
        _id: foundStep?._id,
        type: step.type,
        name: step.stepId,
        controls: step.controls,
        code: step.code,
      };

      return {
        template,
        name: step.stepId,
        stepId: step.stepId,
        uuid: step.stepId,
        shouldStopOnFail: step.shouldStopOnFail ?? false,
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
