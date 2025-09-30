import { NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import {
  ResourceOriginEnum,
  ResourceTypeEnum,
  SeverityLevelEnum,
  ShortIsPrefixEnum,
  StepTypeEnum,
  WorkflowStatusEnum,
} from '@novu/shared';
import { buildSlug } from '../../shared/helpers/build-slug';
import { WorkflowWithPreferencesResponseDto } from '../../workflows-v1/dtos/get-workflow-with-preferences.dto';
import {
  RuntimeIssueDto,
  StepListResponseDto,
  StepResponseDto,
  WorkflowCreateAndUpdateKeys,
  WorkflowListResponseDto,
  WorkflowPreferencesResponseDto,
  WorkflowResponseDto,
} from '../dtos';

export function toResponseWorkflowDto(
  workflow: WorkflowWithPreferencesResponseDto,
  steps: StepResponseDto[],
  payloadExample?: object
): WorkflowResponseDto {
  const preferencesDto: WorkflowPreferencesResponseDto = {
    user: workflow.userPreferences,
    default: workflow.defaultPreferences,
  };
  const workflowName = workflow.name || '';

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
    lastPublishedAt: workflow.lastPublishedAt,
    lastPublishedBy: workflow.lastPublishedBy,
    updatedAt: workflow.updatedAt || '',
    createdAt: workflow.createdAt || '',
    updatedBy: workflow.updatedBy
      ? {
          _id: workflow.updatedBy._id,
          firstName: workflow.updatedBy.firstName,
          lastName: workflow.updatedBy.lastName,
          externalId: workflow.updatedBy.externalId,
        }
      : undefined,
    status: workflow.status || WorkflowStatusEnum.ACTIVE,
    issues: workflow.issues as unknown as Record<WorkflowCreateAndUpdateKeys, RuntimeIssueDto>,
    lastTriggeredAt: workflow.lastTriggeredAt,
    payloadSchema: workflow.payloadSchema,
    payloadExample,
    validatePayload: workflow.validatePayload || false,
    isTranslationEnabled: workflow.isTranslationEnabled || false,
    severity: workflow.severity || SeverityLevelEnum.NONE,
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
    updatedAt: template.updatedAt || '',
    lastPublishedAt: template.lastPublishedAt || '',
    lastPublishedBy: template.lastPublishedBy,
    stepTypeOverviews: template.steps.map(buildStepTypeOverview).filter((stepTypeEnum) => !!stepTypeEnum),
    createdAt: template.createdAt || '',
    updatedBy: template.updatedBy
      ? {
          _id: template.updatedBy._id,
          firstName: template.updatedBy.firstName,
          lastName: template.updatedBy.lastName,
          externalId: template.updatedBy.externalId,
        }
      : undefined,
    status: template.status || WorkflowStatusEnum.ACTIVE,
    lastTriggeredAt: template.lastTriggeredAt,
    isTranslationEnabled: template.isTranslationEnabled || false,
    steps: toStepListResponseDtos(template.steps),
  };
}

export function toWorkflowsMinifiedDtos(templates: NotificationTemplateEntity[]): WorkflowListResponseDto[] {
  return templates.map(toMinifiedWorkflowDto);
}

function toStepListResponseDtos(steps: NotificationStepEntity[]): StepListResponseDto[] {
  return steps.map(toStepListResponseDto);
}

function toStepListResponseDto(step: NotificationStepEntity): StepListResponseDto {
  // biome-ignore lint/style/noNonNullAssertion: always exists
  const stepName = step.name! || 'Missing Name';
  const slug = buildSlug(stepName, ShortIsPrefixEnum.STEP, step._templateId);

  return {
    slug,
    // biome-ignore lint/style/noNonNullAssertion: always exists
    type: step.template?.type!,
    issues: step.issues,
  };
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
