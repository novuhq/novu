import {
  StepResponseDto,
  UpsertStepDataCommand,
  UpsertWorkflowDataCommand,
  WorkflowPreferencesDto,
  WorkflowResponseDto,
} from '@novu/application-generic';
import { PreferencesEntity } from '@novu/dal';
import { PreferencesTypeEnum, ResourceOriginEnum, WorkflowCreationSourceEnum } from '@novu/shared';

export function mapWorkflowToCreateWorkflowDto(
  sourceWorkflow: WorkflowResponseDto,
  preferences: PreferencesEntity[]
): UpsertWorkflowDataCommand {
  return {
    workflowId: sourceWorkflow.workflowId,
    payloadSchema: sourceWorkflow.payloadSchema || null,
    validatePayload: sourceWorkflow.validatePayload,
    isTranslationEnabled: sourceWorkflow.isTranslationEnabled,
    origin: ResourceOriginEnum.NOVU_CLOUD,
    name: sourceWorkflow.name,
    active: sourceWorkflow.active,
    tags: sourceWorkflow.tags,
    description: sourceWorkflow.description,
    __source: WorkflowCreationSourceEnum.DASHBOARD,
    severity: sourceWorkflow.severity,
    agent: sourceWorkflow.agent ?? null,
    steps: mapStepsToCreateOrUpdateDto(sourceWorkflow.steps),
    preferences: mapWorkflowPreferences(preferences),
  };
}

export function mapWorkflowToUpdateWorkflowDto(
  sourceWorkflow: WorkflowResponseDto,
  existingTargetEnvWorkflow: WorkflowResponseDto | undefined,
  preferencesToClone: PreferencesEntity[]
): UpsertWorkflowDataCommand {
  return {
    origin: ResourceOriginEnum.NOVU_CLOUD,
    payloadSchema: sourceWorkflow.payloadSchema || null,
    validatePayload: sourceWorkflow.validatePayload,
    workflowId: sourceWorkflow.workflowId,
    isTranslationEnabled: sourceWorkflow.isTranslationEnabled,
    name: sourceWorkflow.name,
    active: sourceWorkflow.active,
    tags: sourceWorkflow.tags,
    description: sourceWorkflow.description,
    severity: sourceWorkflow.severity,
    agent: sourceWorkflow.agent ?? null,
    steps: mapStepsToCreateOrUpdateDto(sourceWorkflow.steps, existingTargetEnvWorkflow?.steps),
    preferences: mapWorkflowPreferences(preferencesToClone),
  };
}

export function mapWorkflowPreferences(preferences: PreferencesEntity[]): {
  user: WorkflowPreferencesDto | null;
  workflow: WorkflowPreferencesDto | null;
} {
  // we can typecast the preferences to WorkflowPreferences because user and workflow preferences are always full set
  return {
    user: preferences.find((pref) => pref.type === PreferencesTypeEnum.USER_WORKFLOW)
      ?.preferences as WorkflowPreferencesDto | null,
    workflow: preferences.find((pref) => pref.type === PreferencesTypeEnum.WORKFLOW_RESOURCE)
      ?.preferences as WorkflowPreferencesDto | null,
  };
}

function mapStepsToCreateOrUpdateDto(
  sourceSteps: StepResponseDto[],
  targetEnvSteps?: StepResponseDto[]
): UpsertStepDataCommand[] {
  return sourceSteps.map((sourceStep) => {
    // if we find matching step in target environment, we are updating
    const targetStepInternalId = targetEnvSteps?.find((targetStep) => targetStep.stepId === sourceStep.stepId)?._id;

    return buildStepCreateOrUpdateDto(sourceStep, targetStepInternalId);
  });
}

function buildStepCreateOrUpdateDto(sourceStep: StepResponseDto, targetStepInternalId?: string): UpsertStepDataCommand {
  return {
    ...(targetStepInternalId && { _id: targetStepInternalId }),
    stepId: sourceStep.stepId,
    name: sourceStep.name ?? '',
    type: sourceStep.type,
    controlValues: sourceStep.controls?.values ?? {},
    providerOverrides: sourceStep.providerOverrides ?? null,
    integrationOverrides: sourceStep.integrationOverrides ?? null,
  };
}
