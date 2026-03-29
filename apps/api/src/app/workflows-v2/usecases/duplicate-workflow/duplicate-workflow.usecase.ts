import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  GetWorkflowCommand,
  GetWorkflowUseCase,
  InstrumentUsecase,
  PinoLogger,
  StepResponseDto,
  UpsertStepDataCommand,
  UpsertWorkflowCommand,
  UpsertWorkflowDataCommand,
  UpsertWorkflowUseCase,
  WorkflowPreferencesDto,
  WorkflowResponseDto,
} from '@novu/application-generic';
import { LocalizationResourceEnum, PreferencesEntity, PreferencesRepository } from '@novu/dal';
import { PreferencesTypeEnum, ResourceOriginEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { DuplicateWorkflowDto } from '../../dtos';
import { WorkflowNotDuplicableException } from '../../exceptions/workflow-not-duplicable-exception';
import { DuplicateWorkflowCommand } from './duplicate-workflow.command';

export const DUPLICABLE_WORKFLOW_ORIGINS = [ResourceOriginEnum.NOVU_CLOUD];

@Injectable()
export class DuplicateWorkflowUseCase {
  constructor(
    private getWorkflowUseCase: GetWorkflowUseCase,
    private preferencesRepository: PreferencesRepository,
    private upsertWorkflowUseCase: UpsertWorkflowUseCase,
    private moduleRef: ModuleRef,
    private logger: PinoLogger
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
        preserveWorkflowId: !!command.overrides.workflowId,
      })
    );

    if (duplicatedWorkflow.isTranslationEnabled) {
      await this.duplicateTranslationsForWorkflow({
        sourceResourceId: workflow.workflowId,
        targetResourceId: duplicatedWorkflow.workflowId,
        command,
      });
    }

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
      workflowId: overrides.workflowId,
      name: overrides.name ?? `${originWorkflow.name} (Copy)`,
      description: overrides.description ?? originWorkflow.description,
      tags: overrides.tags ?? originWorkflow.tags,
      active: false,
      origin: ResourceOriginEnum.NOVU_CLOUD,
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      steps: this.mapStepsToDuplicate(originWorkflow.steps),
      preferences: this.mapPreferences(preferences),
      isTranslationEnabled: overrides.isTranslationEnabled ?? originWorkflow.isTranslationEnabled,
      payloadSchema: originWorkflow.payloadSchema || null,
      validatePayload: originWorkflow.validatePayload,
      severity: originWorkflow.severity,
    };
  }

  private mapStepsToDuplicate(steps: StepResponseDto[]): UpsertStepDataCommand[] {
    return steps.map((step) => ({
      name: step.name ?? '',
      type: step.type,
      controlValues: step.controls?.values ?? null,
      stepId: step.stepId,
      slug: step.slug,
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

  private async duplicateTranslationsForWorkflow({
    sourceResourceId,
    targetResourceId,
    command,
  }: {
    sourceResourceId: string;
    targetResourceId: string;
    command: DuplicateWorkflowCommand;
  }) {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';

    if (!isEnterprise || isSelfHosted) {
      return;
    }

    try {
      const duplicateLocales = this.moduleRef.get(require('@novu/ee-translation')?.DuplicateLocales, {
        strict: false,
      });

      await duplicateLocales.execute({
        sourceResourceId,
        sourceResourceType: LocalizationResourceEnum.WORKFLOW,
        targetResourceId,
        organizationId: command.user.organizationId,
        environmentId: command.user.environmentId,
        userId: command.user._id,
      });
    } catch (error) {
      this.logger.error(`Failed to duplicate translations for workflow`, {
        sourceResourceId,
        targetResourceId,
        organizationId: command.user.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}
