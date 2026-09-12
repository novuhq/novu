import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import type { NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import {
  ResourceOriginEnum,
  ResourceTypeEnum,
  SeverityLevelEnum,
  TemplateVariableTypeEnum,
  TriggerContextTypeEnum,
  TriggerTypeEnum,
  WorkflowStatusEnum,
} from '@novu/shared';
import { StepIssuesDto } from '../../dtos/step-issues.dto';
import { UserResponseDto } from '../../dtos/user-response.dto';
import { RuntimeIssueDto } from '../../dtos/workflow/runtime-issue.dto';
import { WorkflowAgentConfigDto } from '../../dtos/workflow/workflow-agent-config.dto';
import { WorkflowPreferencesDto } from '../../dtos/workflow/workflow-preferences.dto';
import { WorkflowResponseDto } from '../../dtos/workflow/workflow-response.dto';
import { PreferenceChannelsDto } from './preference-webhook.dto';

type PersistedWorkflowContract = Omit<NotificationTemplateEntity, 'deletedAt' | 'deletedBy'> &
  Partial<Pick<NotificationTemplateEntity, 'deletedAt' | 'deletedBy'>>;

export class WorkflowWebhookTriggerVariableDto {
  @ApiProperty({ description: 'Variable name' })
  name: string;

  @ApiPropertyOptional({ description: 'Default variable value' })
  value?: unknown;

  @ApiPropertyOptional({
    enum: TemplateVariableTypeEnum,
    enumName: 'TemplateVariableTypeEnum',
    description: 'Variable value type',
  })
  type?: TemplateVariableTypeEnum;
}

export class WorkflowWebhookReservedVariableDto {
  @ApiProperty({
    enum: TriggerContextTypeEnum,
    enumName: 'TriggerContextTypeEnum',
    description: 'Reserved context type',
  })
  type: TriggerContextTypeEnum;

  @ApiProperty({ type: [WorkflowWebhookTriggerVariableDto] })
  variables: WorkflowWebhookTriggerVariableDto[];
}

export class WorkflowWebhookSubscriberVariableDto {
  @ApiProperty({ description: 'Subscriber variable name' })
  name: string;
}

export class WorkflowWebhookTriggerDto {
  @ApiProperty({ enum: TriggerTypeEnum, enumName: 'TriggerTypeEnum', description: 'Trigger type' })
  type: TriggerTypeEnum;

  @ApiProperty({ description: 'Trigger identifier used when firing the workflow' })
  identifier: string;

  @ApiProperty({ type: [WorkflowWebhookTriggerVariableDto], description: 'Payload variables declared on the trigger' })
  variables: WorkflowWebhookTriggerVariableDto[];

  @ApiPropertyOptional({
    type: [WorkflowWebhookSubscriberVariableDto],
    description: 'Subscriber variables declared on the trigger',
  })
  subscriberVariables?: WorkflowWebhookSubscriberVariableDto[];

  @ApiPropertyOptional({
    type: [WorkflowWebhookReservedVariableDto],
    description: 'Reserved variables declared on the trigger',
  })
  reservedVariables?: WorkflowWebhookReservedVariableDto[];
}

export class WorkflowWebhookReplyCallbackDto {
  @ApiProperty({ description: 'Whether reply callbacks are enabled' })
  active: boolean;

  @ApiProperty({ description: 'Reply callback URL' })
  url: string;
}

export class PersistedWorkflowStepWebhookDto implements NotificationStepEntity {
  @ApiPropertyOptional({ description: 'Database identifier of the step' })
  _id?: string;

  @ApiPropertyOptional({ description: 'Stable UUID of the step' })
  uuid?: string;

  @ApiPropertyOptional({ description: 'Step identifier used when triggering and correlating events' })
  stepId?: string;

  @ApiPropertyOptional({ description: 'Display name of the step' })
  name?: string;

  @ApiProperty({ description: 'Database identifier of the message template for this step' })
  _templateId: string;

  @ApiPropertyOptional({ description: 'Whether the step is active' })
  active?: boolean;

  @ApiPropertyOptional({ type: () => WorkflowWebhookReplyCallbackDto })
  replyCallback?: NotificationStepEntity['replyCallback'];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Persisted message template for this step',
  })
  template?: NotificationStepEntity['template'];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: 'Step filters',
  })
  filters?: NotificationStepEntity['filters'];

  @ApiPropertyOptional({ description: 'Parent step identifier' })
  _parentId?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Digest, delay, or throttle metadata',
  })
  metadata?: NotificationStepEntity['metadata'];

  @ApiPropertyOptional({ description: 'Whether execution should stop if this step fails' })
  shouldStopOnFail?: boolean;

  @ApiPropertyOptional({ description: 'Bridge URL for framework-backed steps' })
  bridgeUrl?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Control values stored on the step in non-production environments',
  })
  controlVariables?: NotificationStepEntity['controlVariables'];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Control schemas stored on the step',
  })
  controls?: NotificationStepEntity['controls'];

  @ApiPropertyOptional({ type: () => StepIssuesDto })
  issues?: NotificationStepEntity['issues'];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: 'Step variants',
  })
  variants?: NotificationStepEntity['variants'];
}

@ApiExtraModels(RuntimeIssueDto)
export class PersistedWorkflowWebhookDto implements PersistedWorkflowContract {
  @ApiProperty({ description: 'Database identifier of the workflow' })
  _id: string;

  @ApiProperty({ description: 'Name of the workflow' })
  name: string;

  @ApiProperty({ description: 'Description of the workflow' })
  description: string;

  @ApiProperty({ description: 'Whether the workflow is active' })
  active: boolean;

  @ApiProperty({ description: 'Whether the workflow is a draft' })
  draft: boolean;

  @ApiProperty({ type: () => PreferenceChannelsDto })
  preferenceSettings: PreferenceChannelsDto;

  @ApiProperty({ description: 'Whether the workflow ignores subscriber preferences' })
  critical: boolean;

  @ApiProperty({ type: [String], description: 'Tags assigned to the workflow' })
  tags: string[];

  @ApiProperty({ type: [PersistedWorkflowStepWebhookDto], description: 'Persisted workflow steps' })
  steps: PersistedWorkflowStepWebhookDto[];

  @ApiProperty({ description: 'Organization identifier' })
  _organizationId: NotificationTemplateEntity['_organizationId'];

  @ApiProperty({ description: 'User who created the workflow' })
  _creatorId: string;

  @ApiProperty({ description: 'Environment identifier' })
  _environmentId: NotificationTemplateEntity['_environmentId'];

  @ApiProperty({ type: [WorkflowWebhookTriggerDto], description: 'Workflow triggers' })
  triggers: WorkflowWebhookTriggerDto[];

  @ApiProperty({ description: 'Notification group identifier' })
  _notificationGroupId: string;

  @ApiPropertyOptional({ description: 'Parent workflow identifier' })
  _parentId?: string;

  @ApiProperty({
    description:
      'Deletion state captured before workflow.deleted is processed. The deleted event normally carries `false` here.',
  })
  deleted: boolean;

  @ApiPropertyOptional({ description: 'Soft-delete timestamp' })
  deletedAt?: string;

  @ApiPropertyOptional({ description: 'User who deleted the workflow' })
  deletedBy?: string;

  @ApiPropertyOptional({ description: 'Creation timestamp' })
  createdAt?: string;

  @ApiPropertyOptional({ description: 'Last updated timestamp' })
  updatedAt?: string;

  @ApiPropertyOptional({ description: 'User who last updated the workflow' })
  _updatedBy?: string;

  @ApiPropertyOptional({ type: () => UserResponseDto })
  updatedBy?: NotificationTemplateEntity['updatedBy'];

  @ApiProperty({ description: 'Whether the workflow is a blueprint' })
  isBlueprint: boolean;

  @ApiPropertyOptional({ description: 'Blueprint identifier' })
  blueprintId?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, description: 'Custom workflow data' })
  data?: NotificationTemplateEntity['data'];

  @ApiPropertyOptional({ enum: ResourceTypeEnum, enumName: 'ResourceTypeEnum', description: 'Resource type' })
  type?: ResourceTypeEnum;

  @ApiPropertyOptional({ enum: ResourceOriginEnum, enumName: 'ResourceOriginEnum', description: 'Workflow origin' })
  origin?: ResourceOriginEnum;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Raw workflow data retained for legacy workflows',
  })
  rawData?: NotificationTemplateEntity['rawData'];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Payload JSON Schema for the workflow',
  })
  payloadSchema?: NotificationTemplateEntity['payloadSchema'];

  @ApiPropertyOptional({ description: 'Whether payload schema validation is enabled' })
  validatePayload?: boolean;

  @ApiPropertyOptional({ description: 'Whether translations are enabled for this workflow' })
  isTranslationEnabled?: boolean;

  @ApiPropertyOptional({ type: () => WorkflowAgentConfigDto, nullable: true })
  agent?: NotificationTemplateEntity['agent'];

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: getSchemaPath(RuntimeIssueDto) },
    },
    description: 'Runtime issues recorded on the workflow',
  })
  issues: NotificationTemplateEntity['issues'];

  @ApiPropertyOptional({ enum: WorkflowStatusEnum, enumName: 'WorkflowStatusEnum', description: 'Workflow status' })
  status?: WorkflowStatusEnum;

  @ApiPropertyOptional({ description: 'Timestamp of the last workflow trigger' })
  lastTriggeredAt?: string;

  @ApiPropertyOptional({ description: 'Timestamp of the last workflow publication' })
  lastPublishedAt?: string;

  @ApiPropertyOptional({ description: 'User who last published the workflow' })
  _lastPublishedBy?: string;

  @ApiPropertyOptional({ type: () => UserResponseDto })
  lastPublishedBy?: NotificationTemplateEntity['lastPublishedBy'];

  @ApiPropertyOptional({ enum: SeverityLevelEnum, enumName: 'SeverityLevelEnum', description: 'Workflow severity' })
  severity?: SeverityLevelEnum;
}

export class PersistedWorkflowWithPreferencesWebhookDto extends PersistedWorkflowWebhookDto {
  @ApiProperty({ type: () => WorkflowPreferencesDto, nullable: true })
  userPreferences: WorkflowPreferencesDto | null;

  @ApiProperty({ type: () => WorkflowPreferencesDto })
  defaultPreferences: WorkflowPreferencesDto;
}

export class WorkflowCreatedWebhookPayloadDto {
  @ApiProperty({ type: () => WorkflowResponseDto })
  object: WorkflowResponseDto;
}

@ApiExtraModels(PersistedWorkflowWebhookDto, PersistedWorkflowWithPreferencesWebhookDto)
export class WorkflowUpdatedWebhookPayloadDto {
  @ApiProperty({ type: () => WorkflowResponseDto })
  object: WorkflowResponseDto;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(PersistedWorkflowWebhookDto) },
      { $ref: getSchemaPath(PersistedWorkflowWithPreferencesWebhookDto) },
    ],
  })
  previousObject: PersistedWorkflowWebhookDto | PersistedWorkflowWithPreferencesWebhookDto;
}

export class WorkflowPublishedWebhookPayloadDto {
  @ApiProperty({ type: () => WorkflowResponseDto })
  object: WorkflowResponseDto;

  @ApiProperty({ type: () => WorkflowResponseDto })
  previousObject: WorkflowResponseDto;
}

export class WorkflowDeletedWebhookPayloadDto {
  @ApiProperty({ type: () => PersistedWorkflowWebhookDto })
  object: PersistedWorkflowWebhookDto;
}
