import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';

import {
  PreferencesTypeEnum,
  StepCreateDto,
  StepResponseDto,
  WorkflowCreationSourceEnum,
  WorkflowOriginEnum,
  WorkflowPreferences,
  WorkflowResponseDto,
  DuplicateWorkflowDto,
} from '@novu/shared';
import { PreferencesEntity, PreferencesRepository } from '@novu/dal';
import { GetWorkflowUseCase } from '../get-workflow/get-workflow.usecase';
import { UpsertWorkflowUseCase } from '../upsert-workflow/upsert-workflow.usecase';
import { DuplicateWorkflowCommand } from './duplicate-workflow.command';
import { GetWorkflowCommand } from '../get-workflow';
import { UpsertWorkflowCommand, UpsertWorkflowDataCommand } from '../upsert-workflow/upsert-workflow.command';
import { WorkflowNotDuplicableException } from '../../exceptions/workflow-not-duplicable-exception';

export const DUPLICABLE_WORKFLOW_ORIGINS = [WorkflowOriginEnum.NOVU_CLOUD];

@Injectable()
export class DuplicateWorkflowUseCase {
  constructor(
    private getWorkflowUseCase: GetWorkflowUseCase,
    private preferencesRepository: PreferencesRepository,
    private upsertWorkflowUseCase: UpsertWorkflowUseCase
  ) {}

  @InstrumentUsecase()
  async execute(command: DuplicateWorkflowCommand): Promise<WorkflowResponseDto> {
    const workflow = await this.getWorkflowUseCase.execute(
      GetWorkflowCommand.create({
        workflowIdOrInternalId: command.workflowIdOrInternalId,
        user: command.user,
      })
    );

    if (!this.isDuplicable(workflow)) {
      throw new WorkflowNotDuplicableException(workflow);
    }

    const preferences = await this.getWorkflowPreferences(workflow._id, command.user.environmentId);
    const duplicateWorkflowDto = await this.buildDuplicateWorkflowDto(workflow, command.overrides, preferences);

    const duplicatedWorkflow = await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: duplicateWorkflowDto,
        user: command.user,
      })
    );

    return duplicatedWorkflow;
  }

  private isDuplicable(workflow: WorkflowResponseDto): boolean {
    return DUPLICABLE_WORKFLOW_ORIGINS.includes(workflow.origin);
  }

  private async buildDuplicateWorkflowDto(
    originWorkflow: WorkflowResponseDto,
    overrides: DuplicateWorkflowDto,
    preferences: PreferencesEntity[]
  ): Promise<UpsertWorkflowDataCommand> {
    return {
      name: overrides.name ?? `${originWorkflow.name} (Copy)`,
      description: overrides.description ?? originWorkflow.description,
      tags: overrides.tags ?? originWorkflow.tags,
      active: false,
      origin: WorkflowOriginEnum.NOVU_CLOUD,
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      steps: await this.mapStepsToDuplicate(originWorkflow.steps),
      preferences: this.mapPreferences(preferences),
    };
  }

  private async mapStepsToDuplicate(steps: StepResponseDto[]): Promise<StepCreateDto[]> {
    return steps.map((step) => ({
      name: step.name ?? '',
      type: step.type,
      controlValues: step.controls.values ?? {},
    }));
  }

  private mapPreferences(preferences: PreferencesEntity[]): {
    user: WorkflowPreferences | null;
    workflow: WorkflowPreferences | null;
  } {
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
