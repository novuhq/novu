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
import { GetPreferencesResponseDto, slugifyName } from '@novu/application-generic';
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
  const workflowName = template.name || 'Missing Name';

  return {
    _id: template._id,
    slug: `${slugifyName(workflowName)}_${encodeBase62(template._id)}`,
    workflowId: template.triggers[0].identifier,
    name: workflowName,
    tags: template.tags,
    active: template.active,
    preferences: preferencesDto,
    steps: getSteps(template, stepIdToControlValuesMap),
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
  const workflowName = template.name || 'Missing Name';

  return {
    _id: template._id,
    slug: `${slugifyName(workflowName)}_${encodeBase62(template._id)}`,
    name: workflowName,
    origin: template.origin || WorkflowOriginEnum.EXTERNAL,
    type: template.type || ('MISSING-TYPE-ISSUE' as unknown as WorkflowTypeEnum),
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
  const stepName = step.name || 'Missing Name';

  return {
    _id: step._templateId,
    slug: `${slugifyName(stepName)}_${encodeBase62(step._templateId)}`,
    name: stepName,
    stepId: step.stepId || 'Missing Step Id',
    type: step.template?.type || StepTypeEnum.EMAIL,
    controls: convertControls(step),
    controlValues: step.controlVariables || {},
  } satisfies StepResponseDto;
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
