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
import { BadRequestException } from '@nestjs/common';
import { encodeBase62 } from '../../shared/helpers';

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
    id: encodeBase62(template._id),
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
    id: encodeBase62(template._id),
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
    id: encodeBase62(step._templateId),
    // todo - tmp solution uncomment once pr 6689 is merged, remove any cast
    // stepId: step.stepId || 'Missing Step Id',
    name: step.name || 'Missing Name',
    type: step.template?.type || StepTypeEnum.EMAIL,
    controls: convertControls(step),
    controlValues: step.controlVariables || {},
  } as any;
}

function convertControls(step: NotificationStepEntity): ControlsSchema {
  if (step.template?.controls) {
    return { schema: step.template.controls.schema };
  } else {
    throw new BadRequestException('Step controls must be defined.');
  }
}

function buildStepTypeOverview(step: NotificationStepEntity): StepTypeEnum | undefined {
  return step.template?.type;
}
