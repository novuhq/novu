import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import {
  ControlValuesEntity,
  NotificationGroupRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferencesEntity,
} from '@novu/dal';
import {
  CreateWorkflow as CreateWorkflowGeneric,
  CreateWorkflowCommand,
  GetPreferences,
  GetPreferencesCommand,
  GetPreferencesResponseDto,
  NotificationStep,
  UpdateWorkflow,
  UpdateWorkflowCommand,
  UpsertControlValuesCommand,
  UpsertControlValuesUseCase,
  UpsertPreferences,
  UpsertUserWorkflowPreferencesCommand,
  slugifyName,
} from '@novu/application-generic';
import {
  CreateWorkflowDto,
  StepCreateDto,
  StepDto,
  StepUpdateDto,
  WorkflowCreationSourceEnum,
  WorkflowOriginEnum,
  WorkflowResponseDto,
  WorkflowTypeEnum,
} from '@novu/shared';
import slugify from 'slugify';
import { UpsertWorkflowCommand } from './upsert-workflow.command';
import { StepUpsertMechanismFailedMissingIdException } from '../../exceptions/step-upsert-mechanism-failed-missing-id.exception';
import { toResponseWorkflowDto } from '../../mappers/notification-template-mapper';

function buildUpsertControlValuesCommand(
  command: UpsertWorkflowCommand,
  persistedStep: NotificationStepEntity,
  persistedWorkflow: NotificationTemplateEntity,
  stepInDto: StepDto
): UpsertControlValuesCommand {
  return UpsertControlValuesCommand.create({
    organizationId: command.user.organizationId,
    environmentId: command.user.environmentId,
    notificationStepEntity: persistedStep,
    workflowId: persistedWorkflow._id,
    newControlValues: stepInDto.controlValues || {},
  });
}

@Injectable()
export class UpsertWorkflowUseCase {
  constructor(
    private createWorkflowGenericUsecase: CreateWorkflowGeneric,
    private updateWorkflowUsecase: UpdateWorkflow,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private upsertPreferencesUsecase: UpsertPreferences,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase,
    private getPreferencesUseCase: GetPreferences
  ) {}
  async execute(command: UpsertWorkflowCommand): Promise<WorkflowResponseDto> {
    const existingWorkflow = await this.notificationTemplateRepository.findOne({
      _id: command.workflowDatabaseIdForUpdate,
      _environmentId: command.user.environmentId,
    });
    const workflow = await this.createOrUpdateWorkflow(existingWorkflow, command);
    const stepIdToControlValuesMap = await this.upsertControlValues(workflow, command);
    const preferences = await this.upsertPreference(command, workflow);

    return toResponseWorkflowDto(workflow, preferences, stepIdToControlValuesMap);
  }

  private async upsertControlValues(workflow: NotificationTemplateEntity, command: UpsertWorkflowCommand) {
    const stepIdToControlValuesMap: { [p: string]: ControlValuesEntity } = {};
    for (const persistedStep of workflow.steps) {
      const controlValuesEntity = await this.upsertControlValuesForSingleStep(persistedStep, command, workflow);
      if (controlValuesEntity) {
        const { stepId } = persistedStep;

        if (!stepId) {
          throw new NotFoundException(`Step id is not set for workflow ${workflow._id}`);
        }

        stepIdToControlValuesMap[stepId] = controlValuesEntity;
      }
    }

    return stepIdToControlValuesMap;
  }

  private async upsertControlValuesForSingleStep(
    persistedStep: NotificationStepEntity,
    command: UpsertWorkflowCommand,
    persistedWorkflow: NotificationTemplateEntity
  ): Promise<ControlValuesEntity | undefined> {
    const stepDatabaseId = persistedStep._templateId;
    const stepExternalId = persistedStep.name;
    if (!stepDatabaseId && !stepExternalId) {
      throw new StepUpsertMechanismFailedMissingIdException(stepDatabaseId, stepExternalId, persistedStep);
    }
    const stepInDto = command.workflowDto?.steps.find((commandStepItem) => commandStepItem.name === persistedStep.name);
    if (!stepInDto) {
      // TODO: should delete the values from the database?  or just ignore?
      return;
    }

    const upsertControlValuesCommand = buildUpsertControlValuesCommand(
      command,
      persistedStep,
      persistedWorkflow,
      stepInDto
    );

    return await this.upsertControlValuesUseCase.execute(upsertControlValuesCommand);
  }

  private async upsertPreference(
    command: UpsertWorkflowCommand,
    workflow: NotificationTemplateEntity
  ): Promise<GetPreferencesResponseDto | undefined> {
    if (!command.workflowDto.preferences?.user) {
      return undefined;
    }
    await this.upsertPreferences(workflow, command);

    return await this.getPersistedPreferences(workflow);
  }

  private async getPersistedPreferences(workflow) {
    return await this.getPreferencesUseCase.safeExecute(
      GetPreferencesCommand.create({
        environmentId: workflow._environmentId,
        organizationId: workflow._organizationId,
        templateId: workflow._id,
      })
    );
  }

  private async upsertPreferences(workflow, command: UpsertWorkflowCommand): Promise<PreferencesEntity> {
    return await this.upsertPreferencesUsecase.upsertUserWorkflowPreferences(
      UpsertUserWorkflowPreferencesCommand.create({
        environmentId: workflow._environmentId,
        organizationId: workflow._organizationId,
        userId: command.user._id,
        templateId: workflow._id,
        preferences: command.workflowDto.preferences?.user,
      })
    );
  }

  private async createOrUpdateWorkflow(
    existingWorkflow: NotificationTemplateEntity | null | undefined,
    command: UpsertWorkflowCommand
  ): Promise<NotificationTemplateEntity> {
    if (existingWorkflow) {
      return await this.updateWorkflowUsecase.execute(
        UpdateWorkflowCommand.create(this.convertCreateToUpdateCommand(command, existingWorkflow))
      );
    }

    return await this.createWorkflowGenericUsecase.execute(
      CreateWorkflowCommand.create(await this.buildCreateWorkflowGenericCommand(command))
    );
  }

  private async buildCreateWorkflowGenericCommand(command: UpsertWorkflowCommand): Promise<CreateWorkflowCommand> {
    const { user } = command;
    // It's safe to assume we're dealing with CreateWorkflowDto on the creation path
    const workflowDto = command.workflowDto as CreateWorkflowDto;
    const isWorkflowActive = workflowDto?.active ?? true;
    const notificationGroupId = await this.getNotificationGroup(command.user.environmentId);

    if (!notificationGroupId) {
      throw new BadRequestException('Notification group not found');
    }

    return {
      notificationGroupId,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      userId: user._id,
      name: workflowDto.name,
      __source: workflowDto.__source || WorkflowCreationSourceEnum.DASHBOARD,
      type: WorkflowTypeEnum.BRIDGE,
      origin: WorkflowOriginEnum.NOVU_CLOUD,
      steps: this.mapSteps(workflowDto.steps),
      payloadSchema: {},
      active: isWorkflowActive,
      description: workflowDto.description || '',
      tags: workflowDto.tags || [],
      critical: false,
      triggerIdentifier: slugifyName(workflowDto.name),
    };
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
      name: command.workflowDto.name,
      steps: this.mapSteps(workflowDto.steps, existingWorkflow),
      rawData: workflowDto,
      type: WorkflowTypeEnum.BRIDGE,
      description: workflowDto.description,
      tags: workflowDto.tags,
      active: workflowDto.active ?? true,
      workflowId: workflowDto.workflowId,
    };
  }

  private mapSteps(
    commandWorkflowSteps: Array<StepCreateDto | StepUpdateDto>,
    persistedWorkflow?: NotificationTemplateEntity | undefined
  ): NotificationStep[] {
    const steps: NotificationStep[] = commandWorkflowSteps.map((step) => {
      return this.mapSingleStep(persistedWorkflow, step);
    });

    return steps;
  }

  private mapSingleStep(
    persistedWorkflow: NotificationTemplateEntity | undefined,
    step: StepDto | (StepDto & { stepUuid: string })
  ): NotificationStep {
    const stepEntityToReturn = this.buildBaseStepEntity(step);
    const foundPersistedStep = this.getPersistedStepIfFound(persistedWorkflow, step);
    if (foundPersistedStep) {
      return {
        ...stepEntityToReturn,
        _id: foundPersistedStep._templateId,
        _templateId: foundPersistedStep._templateId,
        template: { ...stepEntityToReturn.template, _id: foundPersistedStep._templateId },
      };
    }

    return stepEntityToReturn;
  }

  private buildBaseStepEntity(step: StepDto | (StepDto & { stepUuid: string })): NotificationStep {
    return {
      template: {
        type: step.type,
        name: step.name,
        controls: step.controls,
        content: '',
      },
      stepId: slugify(step.name, { lower: true, strict: true, trim: true }),
      name: step.name,
    };
  }

  private getPersistedStepIfFound(
    persistedWorkflow: NotificationTemplateEntity | undefined,
    stepUpdateRequest: StepUpdateDto | StepCreateDto
  ) {
    if (!persistedWorkflow?.steps) {
      return;
    }

    for (const persistedStep of persistedWorkflow.steps) {
      if (this.isStepUpdateDto(stepUpdateRequest) && persistedStep._templateId === stepUpdateRequest.stepUuid) {
        return persistedStep;
      }
    }
  }

  private isStepUpdateDto(obj: StepDto): obj is StepUpdateDto {
    return typeof obj === 'object' && obj !== null && 'stepUuid' in obj;
  }

  private async getNotificationGroup(environmentId: string): Promise<string | undefined> {
    return (
      await this.notificationGroupRepository.findOne(
        {
          name: 'General',
          _environmentId: environmentId,
        },
        '_id'
      )
    )?._id;
  }
}
