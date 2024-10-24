import {
  ControlsSchema,
  DEFAULT_WORKFLOW_PREFERENCES,
  PreferencesResponseDto,
  PreferencesTypeEnum,
  ShortIsPrefixEnum,
  Slug,
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
import { encodeBase62 } from '../../shared/helpers';

const SLUG_DELIMITER = '_';

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
    slug: buildSlug(workflowName, ShortIsPrefixEnum.WORKFLOW, template._id),
    workflowId: template.triggers[0].identifier,
    name: workflowName,
    tags: template.tags,
    active: template.active,
    preferences: preferencesDto,
    steps: getSteps(template, stepIdToControlValuesMap),
    description: template.description,
    origin: computeOrigin(template),
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
    slug: buildSlug(workflowName, ShortIsPrefixEnum.WORKFLOW, template._id),
    name: workflowName,
    origin: computeOrigin(template),
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
    slug: buildSlug(stepName, ShortIsPrefixEnum.STEP, step._templateId),
    name: stepName,
    stepId: step.stepId || 'Missing Step Id',
    type: step.template?.type || StepTypeEnum.EMAIL,
    controls: convertControls(step),
    controlValues: step.controlVariables || {},
  } satisfies StepResponseDto;
}

/**
 * Builds a slug for a step based on the step name, the short prefix and the internal ID.
 * @returns The slug for the entity, example:  slug: "workflow-name_wf_AbC1Xyz9KlmNOpQr"
 */
function buildSlug(entityName: string, shortIsPrefix: ShortIsPrefixEnum, internalId: string): Slug {
  return `${slugifyName(entityName)}${SLUG_DELIMITER}${shortIsPrefix}${encodeBase62(internalId)}`;
}

function convertControls(step: NotificationStepEntity): ControlsSchema {
  if (step.template?.controls) {
    return { schema: step.template.controls.schema };
  }

  return { schema: {} }; // This is not a usecase, it's only here to be backwards compatible with V1 Notification Entities
}

function buildStepTypeOverview(step: NotificationStepEntity): StepTypeEnum | undefined {
  return step.template?.type;
}

function computeOrigin(template: NotificationTemplateEntity): WorkflowOriginEnum {
  // Required to differentiate between old V1 and new workflows in an attempt to eliminate the need for type field
  return template?.type === WorkflowTypeEnum.REGULAR
    ? WorkflowOriginEnum.NOVU_CLOUD_V1
    : template.origin || WorkflowOriginEnum.EXTERNAL;
}
