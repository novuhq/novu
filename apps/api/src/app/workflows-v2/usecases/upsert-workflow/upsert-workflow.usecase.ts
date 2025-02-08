import { BadRequestException, Injectable } from '@nestjs/common';

import {
  AnalyticsService,
  CreateWorkflowCommand,
  CreateWorkflow as CreateWorkflowGeneric,
  GetWorkflowByIdsCommand,
  GetWorkflowByIdsUseCase,
  Instrument,
  InstrumentUsecase,
  NotificationStep,
  shortId,
  UpdateWorkflowCommand,
  UpdateWorkflow as UpdateWorkflowGeneric,
  UpsertControlValuesCommand,
  UpsertControlValuesUseCase,
  WorkflowInternalResponseDto,
} from '@novu/application-generic';
import {
  ControlValuesRepository,
  NotificationGroupRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import {
  ControlSchemas,
  ControlValuesLevelEnum,
  DEFAULT_WORKFLOW_PREFERENCES,
  slugify,
  StepCreateDto,
  StepIssuesDto,
  StepUpdateDto,
  UserSessionData,
  WorkflowCreationSourceEnum,
  WorkflowOriginEnum,
  WorkflowResponseDto,
  WorkflowTypeEnum,
} from '@novu/shared';

import { stepTypeToControlSchema } from '../../shared';
import { computeWorkflowStatus } from '../../shared/compute-workflow-status';
import { BuildStepIssuesUsecase } from '../build-step-issues/build-step-issues.usecase';
import { GetWorkflowCommand, GetWorkflowUseCase } from '../get-workflow';
import { UpsertWorkflowCommand, UpsertWorkflowDataCommand } from './upsert-workflow.command';

@Injectable()
export class UpsertWorkflowUseCase {
  constructor(
    private createWorkflowGenericUsecase: CreateWorkflowGeneric,
    private updateWorkflowGenericUsecase: UpdateWorkflowGeneric,
    private notificationGroupRepository: NotificationGroupRepository,
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private getWorkflowUseCase: GetWorkflowUseCase,
    private buildStepIssuesUsecase: BuildStepIssuesUsecase,
    private controlValuesRepository: ControlValuesRepository,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase,
    private analyticsService: AnalyticsService
  ) {}

  @InstrumentUsecase()
  async execute(command: UpsertWorkflowCommand): Promise<WorkflowResponseDto> {
    const workflowForUpdate = await this.queryWorkflow(command);
    const persistedWorkflow = await this.createOrUpdateWorkflow(workflowForUpdate, command);
    // TODO: this upsertControlValues logic should be moved to the create/update workflow usecase
    await this.upsertControlValues(persistedWorkflow, command);
    const workflow = await this.getWorkflowUseCase.execute(
      GetWorkflowCommand.create({
        workflowIdOrInternalId: persistedWorkflow._id,
        user: command.user,
      })
    );

    return workflow;
  }

  @Instrument()
  private async queryWorkflow(command: UpsertWorkflowCommand): Promise<WorkflowInternalResponseDto | null> {
    if (!command.workflowIdOrInternalId) {
      return null;
    }

    return await this.getWorkflowByIdsUseCase.execute(
      GetWorkflowByIdsCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        userId: command.user._id,
        workflowIdOrInternalId: command.workflowIdOrInternalId,
      })
    );
  }

  @Instrument()
  private async createOrUpdateWorkflow(
    existingWorkflow: NotificationTemplateEntity | null,
    command: UpsertWorkflowCommand
  ): Promise<WorkflowInternalResponseDto> {
    if (existingWorkflow && isWorkflowUpdateDto(command.workflowDto, command.workflowIdOrInternalId)) {
      this.analyticsService.mixpanelTrack('Workflow Update - [API]', command.user._id, {
        _organization: command.user.organizationId,
        name: command.workflowDto.name,
        tags: command.workflowDto.tags || [],
        origin: command.workflowDto.origin,
        source: command.workflowDto.__source,
      });

      return await this.updateWorkflowGenericUsecase.execute(
        UpdateWorkflowCommand.create(
          await this.buildUpdateWorkflowCommand(command.workflowDto, command.user, existingWorkflow)
        )
      );
    }

    this.analyticsService.mixpanelTrack('Workflow Created - [API]', command.user?._id, {
      _organization: command.user?.organizationId,
      name: command.workflowDto?.name,
      tags: command.workflowDto?.tags || [],
      origin: command.workflowDto?.origin,
      source: command.workflowDto?.__source,
    });

    return await this.createWorkflowGenericUsecase.execute(
      CreateWorkflowCommand.create(await this.buildCreateWorkflowCommand(command))
    );
  }

  @Instrument()
  private async buildCreateWorkflowCommand(command: UpsertWorkflowCommand): Promise<CreateWorkflowCommand> {
    const { user, workflowDto } = command;
    const isWorkflowActive = workflowDto?.active ?? true;
    const notificationGroupId = await this.getNotificationGroup(command.user.environmentId);

    if (!notificationGroupId) {
      throw new BadRequestException('Notification group not found');
    }
    const steps = await this.mapSteps(workflowDto.origin, command.user, workflowDto.steps);

    return {
      notificationGroupId,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      userId: user._id,
      name: workflowDto.name,
      __source: workflowDto.__source || WorkflowCreationSourceEnum.DASHBOARD,
      type: WorkflowTypeEnum.BRIDGE,
      origin: WorkflowOriginEnum.NOVU_CLOUD,
      steps,
      active: isWorkflowActive,
      description: workflowDto.description || '',
      tags: workflowDto.tags || [],
      userPreferences: command.workflowDto.preferences?.user ?? null,
      defaultPreferences: command.workflowDto.preferences?.workflow ?? DEFAULT_WORKFLOW_PREFERENCES,
      triggerIdentifier: slugify(workflowDto.name),
      status: computeWorkflowStatus(isWorkflowActive, steps),
    };
  }

  private async buildUpdateWorkflowCommand(
    workflowDto: UpsertWorkflowDataCommand,
    user: UserSessionData,
    existingWorkflow: NotificationTemplateEntity
  ): Promise<UpdateWorkflowCommand> {
    const steps = await this.mapSteps(workflowDto.origin, user, workflowDto.steps, existingWorkflow);
    const workflowActive = workflowDto.active ?? true;

    return {
      id: existingWorkflow._id,
      environmentId: existingWorkflow._environmentId,
      organizationId: user.organizationId,
      userId: user._id,
      name: workflowDto.name,
      steps,
      rawData: workflowDto as unknown as Record<string, unknown>,
      type: WorkflowTypeEnum.BRIDGE,
      description: workflowDto.description,
      userPreferences: workflowDto.preferences?.user ?? null,
      defaultPreferences: workflowDto.preferences?.workflow ?? DEFAULT_WORKFLOW_PREFERENCES,
      tags: workflowDto.tags,
      active: workflowActive,
      status: computeWorkflowStatus(workflowActive, steps),
    };
  }

  private async mapSteps(
    workflowOrigin: WorkflowOriginEnum,
    user: UserSessionData,
    commandWorkflowSteps: Array<StepCreateDto | StepUpdateDto>,
    persistedWorkflow?: NotificationTemplateEntity | undefined
  ): Promise<NotificationStep[]> {
    const steps: NotificationStep[] = [];

    for (const step of commandWorkflowSteps) {
      const mappedStep = await this.mapSingleStep(workflowOrigin, user, persistedWorkflow, step);
      const baseStepId = mappedStep.stepId;

      if (baseStepId) {
        const previousStepIds = steps.map((stepX) => stepX.stepId).filter((id) => id != null);
        mappedStep.stepId = this.generateUniqueStepId(baseStepId, previousStepIds);
      }

      steps.push(mappedStep);
    }

    return steps;
  }

  private generateUniqueStepId(baseStepId: string, previousStepIds: string[]): string {
    let currentStepId = baseStepId;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      if (isUniqueStepId(currentStepId, previousStepIds)) {
        break;
      }
      currentStepId = `${baseStepId}-${shortId()}`;
      attempts += 1;
    }

    if (attempts === maxAttempts && !isUniqueStepId(currentStepId, previousStepIds)) {
      throw new BadRequestException({
        message: 'Failed to generate unique stepId',
        stepId: baseStepId,
      });
    }

    return currentStepId;
  }

  private async mapSingleStep(
    workflowOrigin: WorkflowOriginEnum,
    user: UserSessionData,
    persistedWorkflow: NotificationTemplateEntity | undefined,
    step: StepUpdateDto | StepCreateDto
  ): Promise<NotificationStep> {
    const foundPersistedStep = this.getPersistedStepIfFound(persistedWorkflow, step);
    const controlSchemas: ControlSchemas = foundPersistedStep?.template?.controls || stepTypeToControlSchema[step.type];
    const issues: StepIssuesDto = await this.buildStepIssuesUsecase.execute({
      workflowOrigin,
      user,
      stepInternalId: foundPersistedStep?._id,
      workflow: persistedWorkflow,
      stepType: step.type,
      controlSchema: controlSchemas.schema,
      controlsDto: step.controlValues,
    });

    const stepEntityToReturn = {
      template: {
        type: step.type,
        name: step.name,
        controls: controlSchemas,
        content: '',
      },
      stepId: foundPersistedStep?.stepId || slugify(step.name),
      name: step.name,
      issues,
    };

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

  private getPersistedStepIfFound(
    persistedWorkflow: NotificationTemplateEntity | undefined,
    stepUpdateRequest: StepUpdateDto | StepCreateDto
  ) {
    if (!persistedWorkflow?.steps) {
      return;
    }

    for (const persistedStep of persistedWorkflow.steps) {
      if (this.isStepUpdateDto(stepUpdateRequest) && persistedStep._templateId === stepUpdateRequest._id) {
        return persistedStep;
      }
    }
  }

  private isStepUpdateDto(obj: StepUpdateDto | StepCreateDto): obj is StepUpdateDto {
    return typeof obj === 'object' && obj !== null && !!(obj as StepUpdateDto)._id;
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

  @Instrument()
  private async upsertControlValues(
    workflow: NotificationTemplateEntity,
    command: UpsertWorkflowCommand
  ): Promise<void> {
    const controlValuesUpdates = this.getControlValuesUpdates(workflow.steps, command);
    if (controlValuesUpdates.length === 0) return;

    await Promise.all(
      controlValuesUpdates.map((update) => this.executeControlValuesUpdate(update, workflow._id, command))
    );
  }

  private getControlValuesUpdates(steps: NotificationStepEntity[], command: UpsertWorkflowCommand) {
    return steps
      .map((step) => {
        const controlValues = this.findControlValueInRequest(step, command.workflowDto.steps);
        if (controlValues === undefined) return null;

        return {
          step,
          controlValues,
          shouldDelete: controlValues === null,
        };
      })
      .filter((update): update is NonNullable<typeof update> => update !== null);
  }

  private executeControlValuesUpdate(
    update: { step: NotificationStepEntity; controlValues: Record<string, unknown> | null; shouldDelete: boolean },
    workflowId: string,
    command: UpsertWorkflowCommand
  ) {
    if (update.shouldDelete) {
      return this.controlValuesRepository.delete({
        _environmentId: command.user.environmentId,
        _organizationId: command.user.organizationId,
        _workflowId: workflowId,
        _stepId: update.step._templateId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
    }

    return this.upsertControlValuesUseCase.execute(
      UpsertControlValuesCommand.create({
        organizationId: command.user.organizationId,
        environmentId: command.user.environmentId,
        notificationStepEntity: update.step,
        workflowId,
        newControlValues: update.controlValues || {},
      })
    );
  }

  private findControlValueInRequest(
    step: NotificationStepEntity,
    steps: (StepCreateDto | StepUpdateDto)[] | StepCreateDto[]
  ): Record<string, unknown> | undefined | null {
    return steps.find((stepRequest) => {
      if (this.isStepUpdateDto(stepRequest)) {
        return stepRequest._id === step._templateId;
      }

      return stepRequest.name === step.name;
    })?.controlValues;
  }
}

function isWorkflowUpdateDto(workflowDto: UpsertWorkflowDataCommand, id?: string) {
  return !!id;
}

function isUniqueStepId(stepIdToValidate: string, otherStepsIds: string[]) {
  return !otherStepsIds.some((stepId) => stepId === stepIdToValidate);
}
