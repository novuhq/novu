import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';

import { PreferencesTypeEnum, WorkflowCreationSourceEnum, ResourceOriginEnum } from '@novu/shared';
import { PreferencesEntity, PreferencesRepository } from '@novu/dal';
import { GetWorkflowCommand, GetWorkflowUseCase } from '../get-workflow';
import {
  UpsertWorkflowCommand,
  UpsertWorkflowDataCommand,
  UpsertWorkflowUseCase,
  UpsertStepDataCommand,
} from '../upsert-workflow';
import { DuplicateWorkflowCommand } from './duplicate-workflow.command';
import { DuplicateWorkflowDto, StepResponseDto, WorkflowPreferencesDto, WorkflowResponseDto } from '../../dtos';
import { WorkflowNotDuplicableException } from '../../exceptions/workflow-not-duplicable-exception';

export const DUPLICABLE_WORKFLOW_ORIGINS = [ResourceOriginEnum.NOVU_CLOUD];

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

    return await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: duplicateWorkflowDto,
        user: command.user,
      })
    );
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
      origin: ResourceOriginEnum.NOVU_CLOUD,
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      steps: this.mapStepsToDuplicate(originWorkflow.steps),
      preferences: this.mapPreferences(preferences),
      isTranslationEnabled: overrides.isTranslationEnabled ?? originWorkflow.isTranslationEnabled,
    };
  }

  private mapStepsToDuplicate(steps: StepResponseDto[]): UpsertStepDataCommand[] {
    return steps.map((step) => ({
      name: step.name ?? '',
      type: step.type,
      controlValues: step.controls.values ?? null,
    }));
  }

  private mapPreferences(preferences: PreferencesEntity[]): {
    user: WorkflowPreferencesDto | null;
    workflow: WorkflowPreferencesDto | null;
  } {
    return {
      user: preferences.find((pref) => pref.type === PreferencesTypeEnum.USER_WORKFLOW)
        ?.preferences as WorkflowPreferencesDto | null,
      workflow: preferences.find((pref) => pref.type === PreferencesTypeEnum.WORKFLOW_RESOURCE)
        ?.preferences as WorkflowPreferencesDto | null,
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
