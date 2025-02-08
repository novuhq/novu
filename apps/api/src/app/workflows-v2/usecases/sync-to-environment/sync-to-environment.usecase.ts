import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PreferencesTypeEnum,
  StepCreateDto,
  StepResponseDto,
  StepUpdateDto,
  WorkflowCreationSourceEnum,
  WorkflowOriginEnum,
  WorkflowPreferences,
  WorkflowResponseDto,
} from '@novu/shared';
import { PreferencesEntity, PreferencesRepository } from '@novu/dal';
import { Instrument, InstrumentUsecase } from '@novu/application-generic';
import { SyncToEnvironmentCommand } from './sync-to-environment.command';
import { GetWorkflowCommand, GetWorkflowUseCase } from '../get-workflow';
import { UpsertWorkflowCommand, UpsertWorkflowDataCommand, UpsertWorkflowUseCase } from '../upsert-workflow';

/**
 * This usecase is used to sync a workflow from one environment to another.
 * It will create a new workflow in the target environment if it doesn't exist, or update it if it does.
 * The cloning of the workflow to the target environment includes:
 * - the workflow (NotificationTemplateEntity) + steps
 * - the preferences (PreferencesEntity)
 * - the control values (ControlValuesEntity)
 * - the message template (MessageTemplateEntity)
 */
@Injectable()
export class SyncToEnvironmentUseCase {
  constructor(
    private getWorkflowUseCase: GetWorkflowUseCase,
    private preferencesRepository: PreferencesRepository,
    private upsertWorkflowUseCase: UpsertWorkflowUseCase
  ) {}

  @InstrumentUsecase()
  async execute(command: SyncToEnvironmentCommand): Promise<WorkflowResponseDto> {
    if (command.user.environmentId === command.targetEnvironmentId) {
      throw new BadRequestException('Cannot sync workflow to the same environment');
    }

    const originWorkflow = await this.getWorkflowToClone(command);
    const preferencesToClone = await this.getWorkflowPreferences(originWorkflow._id, command.user.environmentId);
    const externalId = originWorkflow.workflowId;
    const targetWorkflow = await this.findWorkflowInTargetEnvironment(command, externalId);
    const workflowDto = await this.buildRequestDto(originWorkflow, preferencesToClone, targetWorkflow);

    return await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        user: { ...command.user, environmentId: command.targetEnvironmentId },
        workflowIdOrInternalId: targetWorkflow?._id,
        workflowDto,
      })
    );
  }

  @Instrument()
  private async buildRequestDto(
    originWorkflow: WorkflowResponseDto,
    preferencesToClone: PreferencesEntity[],
    targetWorkflow?: WorkflowResponseDto
  ): Promise<UpsertWorkflowDataCommand> {
    if (targetWorkflow) {
      return await this.mapWorkflowToUpdateWorkflowDto(originWorkflow, targetWorkflow, preferencesToClone);
    }

    return await this.mapWorkflowToCreateWorkflowDto(originWorkflow, preferencesToClone);
  }

  @Instrument()
  private async getWorkflowToClone(command: SyncToEnvironmentCommand): Promise<WorkflowResponseDto> {
    return this.getWorkflowUseCase.execute(
      GetWorkflowCommand.create({
        user: command.user,
        workflowIdOrInternalId: command.workflowIdOrInternalId,
      })
    );
  }

  @Instrument()
  private async findWorkflowInTargetEnvironment(
    command: SyncToEnvironmentCommand,
    externalId: string
  ): Promise<WorkflowResponseDto | undefined> {
    try {
      return await this.getWorkflowUseCase.execute(
        GetWorkflowCommand.create({
          user: { ...command.user, environmentId: command.targetEnvironmentId },
          workflowIdOrInternalId: externalId,
        })
      );
    } catch (error) {
      return undefined;
    }
  }

  @Instrument()
  private async mapWorkflowToCreateWorkflowDto(
    originWorkflow: WorkflowResponseDto,
    preferences: PreferencesEntity[]
  ): Promise<UpsertWorkflowDataCommand> {
    return {
      workflowId: originWorkflow.workflowId,
      origin: WorkflowOriginEnum.NOVU_CLOUD,
      name: originWorkflow.name,
      active: originWorkflow.active,
      tags: originWorkflow.tags,
      description: originWorkflow.description,
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      steps: await this.mapStepsToCreateOrUpdateDto(originWorkflow.steps),
      preferences: this.mapPreferences(preferences),
    };
  }

  @Instrument()
  private async mapWorkflowToUpdateWorkflowDto(
    originWorkflow: WorkflowResponseDto,
    existingTargetEnvWorkflow: WorkflowResponseDto | undefined,
    preferencesToClone: PreferencesEntity[]
  ): Promise<UpsertWorkflowDataCommand> {
    return {
      origin: WorkflowOriginEnum.NOVU_CLOUD,
      workflowId: originWorkflow.workflowId,
      name: originWorkflow.name,
      active: originWorkflow.active,
      tags: originWorkflow.tags,
      description: originWorkflow.description,
      steps: await this.mapStepsToCreateOrUpdateDto(originWorkflow.steps, existingTargetEnvWorkflow?.steps),
      preferences: this.mapPreferences(preferencesToClone),
    };
  }

  @Instrument()
  private async mapStepsToCreateOrUpdateDto(
    originSteps: StepResponseDto[],
    targetEnvSteps?: StepResponseDto[]
  ): Promise<(StepUpdateDto | StepCreateDto)[]> {
    return originSteps.map((sourceStep) => {
      // if we find matching step in target environment, we are updating
      const targetEnvStepInternalId = targetEnvSteps?.find(
        (targetStep) => targetStep.stepId === sourceStep.stepId
      )?._id;

      return this.buildStepCreateOrUpdateDto(sourceStep, targetEnvStepInternalId);
    });
  }

  private buildStepCreateOrUpdateDto(
    step: StepResponseDto,
    existingInternalId?: string
  ): StepUpdateDto | StepCreateDto {
    return {
      ...(existingInternalId && { _id: existingInternalId }),
      name: step.name ?? '',
      type: step.type,
      controlValues: step.controls.values ?? {},
    };
  }

  private mapPreferences(preferences: PreferencesEntity[]): {
    user: WorkflowPreferences | null;
    workflow: WorkflowPreferences | null;
  } {
    // we can typecast the preferences to WorkflowPreferences because user and workflow preferences are always full set
    return {
      user: preferences.find((pref) => pref.type === PreferencesTypeEnum.USER_WORKFLOW)
        ?.preferences as WorkflowPreferences | null,
      workflow: preferences.find((pref) => pref.type === PreferencesTypeEnum.WORKFLOW_RESOURCE)
        ?.preferences as WorkflowPreferences | null,
    };
  }

  private async getWorkflowPreferences(workflowId: string, environmentId: string): Promise<PreferencesEntity[]> {
    return await this.preferencesRepository.find({
      _templateId: workflowId,
      _environmentId: environmentId,
      type: {
        $in: [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW],
      },
    });
  }
}
