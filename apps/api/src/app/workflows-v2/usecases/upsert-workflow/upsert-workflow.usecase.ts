import { BadRequestException, Injectable } from '@nestjs/common';

import {
  ControlValuesEntity,
  EnvironmentRepository,
  NotificationGroupRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
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
} from '@novu/application-generic';
import { WorkflowCreationSourceEnum, WorkflowOriginEnum, WorkflowTypeEnum } from '@novu/shared';
import { PreferencesEntity } from '@novu/dal/src';
import { UpsertWorkflowCommand } from './upsert-workflow.command';
import { WorkflowAlreadyExistException } from '../../exceptions/workflow-already-exist';
import { StepCreateDto, StepDto, StepUpdateDto } from '../../dto/workflow-commons-fields';
import { StepUpsertMechanismFailedMissingIdException } from '../../exceptions/step-upsert-mechanism-failed-missing-id.exception';
import { CreateWorkflowDto } from '../../dto/create-workflow-dto';
import { WorkflowResponseDto } from '../../dto/workflow-response-dto';

function buildUpsertControlValuesCommand(command: UpsertWorkflowCommand, persistedStep, persistedWorkflow, stepInDto) {
  return UpsertControlValuesCommand.create({
    organizationId: command.user.organizationId,
    environmentId: command.user.environmentId,
    notificationStepEntity: persistedStep,
    workflowId: persistedWorkflow._id,
    newControlValues: stepInDto.controlValues || {},
    controlSchemas: stepInDto?.controls || { schema: {} },
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
    private environmentRepository: EnvironmentRepository,
    private getPreferencesUseCase: GetPreferences
  ) {}
  async execute(command: UpsertWorkflowCommand): Promise<WorkflowResponseDto> {
    const workflowForUpdate = await this.getWorkflowIfUpdateAndExist(command);
    if (!workflowForUpdate && (await this.workflowExistByExternalId(command))) {
      throw new WorkflowAlreadyExistException(command);
    }
    const workflow = await this.createOrUpdateWorkflow(workflowForUpdate, command);
    const stepIdToControlValuesMap = await this.upsertControlValues(workflow, command);
    const preferences = await this.upsertPreference(command, workflow);

    return toResponseWorkflowDto(workflow, preferences, stepIdToControlValuesMap);
  }

  private async upsertControlValues(workflow: NotificationTemplateEntity, command: UpsertWorkflowCommand) {
    const stepIdToControlValuesMap: { [p: string]: ControlValuesEntity } = {};
    for (const persistedStep of workflow.steps) {
      const controlValuesEntity = await this.upsertControlValuesForSingleStep(persistedStep, command, workflow);
      if (controlValuesEntity) {
        stepIdToControlValuesMap[persistedStep._templateId] = controlValuesEntity;
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

    return await this.getPresistedPreferences(workflow);
  }

  private async getPresistedPreferences(workflow) {
    return await this.getPreferencesUseCase.execute(
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
      origin: WorkflowOriginEnum.NOVU,
      steps: this.mapSteps(workflowDto.steps),
      payloadSchema: {},
      active: isWorkflowActive,
      description: workflowDto.description || '',
      tags: workflowDto.tags || [],
      critical: false,
    };
  }

  private async getWorkflowIfUpdateAndExist(upsertCommand: UpsertWorkflowCommand) {
    if (upsertCommand.workflowDatabaseIdForUpdate) {
      return await this.notificationTemplateRepository.findByIdQuery({
        id: upsertCommand.workflowDatabaseIdForUpdate,
        environmentId: upsertCommand.user.environmentId,
      });
    }
  }

  private async workflowExistByExternalId(upsertCommand: UpsertWorkflowCommand) {
    const { environmentId } = upsertCommand.user;
    const workflowByDbId = await this.notificationTemplateRepository.findByTriggerIdentifier(
      environmentId,
      upsertCommand.workflowDto.name
    );

    return !!workflowByDbId;
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

  private buildBaseStepEntity(step: StepDto | (StepDto & { stepUuid: string })) {
    return {
      template: {
        type: step.type,
        name: step.name,
        controls: step.controls,
        content: '',
      },
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
