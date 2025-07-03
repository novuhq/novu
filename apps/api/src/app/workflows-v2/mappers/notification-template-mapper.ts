import { NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import {
  ShortIsPrefixEnum,
  StepTypeEnum,
  ResourceOriginEnum,
  WorkflowStatusEnum,
  ResourceTypeEnum,
} from '@novu/shared';
import { buildSlug } from '../../shared/helpers/build-slug';
import {
  RuntimeIssueDto,
  StepResponseDto,
  WorkflowCreateAndUpdateKeys,
  WorkflowListResponseDto,
  WorkflowPreferencesResponseDto,
  WorkflowResponseDto,
} from '../dtos';
import { WorkflowWithPreferencesResponseDto } from '../../workflows-v1/dtos/get-workflow-with-preferences.dto';

export function toResponseWorkflowDto(
  workflow: WorkflowWithPreferencesResponseDto,
  steps: StepResponseDto[],
  payloadExample?: object
): WorkflowResponseDto {
  const preferencesDto: WorkflowPreferencesResponseDto = {
    user: workflow.userPreferences,
    default: workflow.defaultPreferences,
  };
  const workflowName = workflow.name || 'Missing Name | UPDATE IMMEDIATELY';

  return {
    _id: workflow._id,
    slug: buildSlug(workflowName, ShortIsPrefixEnum.WORKFLOW, workflow._id),
    workflowId: workflow.triggers[0].identifier,
    name: workflowName,
    tags: workflow.tags,
    active: workflow.active,
    preferences: preferencesDto,
    steps,
    description: workflow.description,
    origin: computeOrigin(workflow),
    updatedAt: workflow.updatedAt || 'Missing Updated At',
    createdAt: workflow.createdAt || 'Missing Create At',
    status: workflow.status || WorkflowStatusEnum.ACTIVE,
    issues: workflow.issues as unknown as Record<WorkflowCreateAndUpdateKeys, RuntimeIssueDto>,
    lastTriggeredAt: workflow.lastTriggeredAt,
    payloadSchema: workflow.payloadSchema,
    payloadExample,
    validatePayload: workflow.validatePayload,
    isTranslationEnabled: workflow.isTranslationEnabled,
  };
}

function toMinifiedWorkflowDto(template: NotificationTemplateEntity): WorkflowListResponseDto {
  const workflowName = template.name || 'Missing Name';

  return {
    _id: template._id,
    workflowId: template.triggers[0].identifier,
    slug: buildSlug(workflowName, ShortIsPrefixEnum.WORKFLOW, template._id),
    name: workflowName,
    origin: computeOrigin(template),
    tags: template.tags,
    updatedAt: template.updatedAt || 'Missing Updated At',
    stepTypeOverviews: template.steps.map(buildStepTypeOverview).filter((stepTypeEnum) => !!stepTypeEnum),
    createdAt: template.createdAt || 'Missing Create At',
    status: template.status || WorkflowStatusEnum.ACTIVE,
    lastTriggeredAt: template.lastTriggeredAt,
  };
}

export function toWorkflowsMinifiedDtos(templates: NotificationTemplateEntity[]): WorkflowListResponseDto[] {
  return templates.map(toMinifiedWorkflowDto);
}

function buildStepTypeOverview(step: NotificationStepEntity): StepTypeEnum | undefined {
  return step.template?.type;
}

function computeOrigin(template: NotificationTemplateEntity): ResourceOriginEnum {
  // Required to differentiate between old V1 and new workflows in an attempt to eliminate the need for type field
  if (typeof template.type === 'undefined' && typeof template.origin === 'undefined') {
    return ResourceOriginEnum.NOVU_CLOUD_V1;
  }

  return template?.type === ResourceTypeEnum.REGULAR
    ? ResourceOriginEnum.NOVU_CLOUD_V1
    : template.origin || ResourceOriginEnum.EXTERNAL;
}
