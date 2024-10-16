import {
  ControlsSchema,
  DEFAULT_WORKFLOW_PREFERENCES,
  PreferencesResponseDto,
  PreferencesTypeEnum,
  StepResponseDto,
  StepTypeEnum,
  WorkflowListResponseDto,
  WorkflowOriginEnum,
  WorkflowResponseDto,
  WorkflowStatusEnum,
  WorkflowTypeEnum,
} from '@novu/shared';
import { ControlValuesEntity, NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import { GetPreferencesResponseDto } from '@novu/application-generic';

export function toResponseWorkflowDto(
  template: NotificationTemplateEntity,
  preferences: GetPreferencesResponseDto | undefined,
  stepIdToControlValuesMap: { [p: string]: ControlValuesEntity }
): WorkflowResponseDto {
  const preferencesDto: PreferencesResponseDto = {
    user: preferences?.source[PreferencesTypeEnum.USER_WORKFLOW] || null,
    default: preferences?.source[PreferencesTypeEnum.WORKFLOW_RESOURCE] || DEFAULT_WORKFLOW_PREFERENCES,
  };

  return {
    _id: template._id,
    tags: template.tags,
    active: template.active,
    preferences: preferencesDto,
    steps: getSteps(template, stepIdToControlValuesMap),
    name: template.name,
    workflowId: template.triggers[0].identifier,
    description: template.description,
    origin: template.origin || WorkflowOriginEnum.EXTERNAL,
    type: template.type || ('MISSING-TYPE-ISSUE' as unknown as WorkflowTypeEnum),
    updatedAt: template.updatedAt || 'Missing Updated At',
    createdAt: template.createdAt || 'Missing Create At',
    status: WorkflowStatusEnum.ACTIVE,
  };
}

function getSteps(template: NotificationTemplateEntity, controlValuesMap: { [p: string]: ControlValuesEntity }) {
  const steps: StepResponseDto[] = [];
  for (const step of template.steps) {
    const stepResponseDto = toStepResponseDto(step);
    const controlValues = controlValuesMap[step._templateId];
    if (controlValues?.controls && Object.entries(controlValues?.controls).length) {
      stepResponseDto.controlValues = controlValues.controls;
    }
    steps.push(stepResponseDto);
  }

  return steps;
}

function toMinifiedWorkflowDto(template: NotificationTemplateEntity): WorkflowListResponseDto {
  return {
    origin: template.origin || WorkflowOriginEnum.EXTERNAL,
    type: template.type || ('MISSING-TYPE-ISSUE' as unknown as WorkflowTypeEnum),
    _id: template._id,
    name: template.name,
    tags: template.tags,
    updatedAt: template.updatedAt || 'Missing Updated At',
    stepTypeOverviews: template.steps.map(buildStepTypeOverview).filter((stepTypeEnum) => !!stepTypeEnum),
    createdAt: template.createdAt || 'Missing Create At',
    status: WorkflowStatusEnum.ACTIVE,
  };
}

export function toWorkflowsMinifiedDtos(templates: NotificationTemplateEntity[]): WorkflowListResponseDto[] {
  return templates.map(toMinifiedWorkflowDto);
}

function toStepResponseDto(step: NotificationStepEntity): StepResponseDto {
  return {
    name: step.name || 'Missing Name',
    stepUuid: step._templateId,
    type: step.template?.type || StepTypeEnum.EMAIL,
    controls: convertControls(step),
    controlValues: step.controlVariables || {},
  };
}

function convertControls(step: NotificationStepEntity): ControlsSchema {
  if (step.template?.controls) {
    return { schema: step.template.controls.schema };
  } else {
    throw new Error('Missing controls');
  }
}

function buildStepTypeOverview(step: NotificationStepEntity): StepTypeEnum | undefined {
  return step.template?.type;
}
