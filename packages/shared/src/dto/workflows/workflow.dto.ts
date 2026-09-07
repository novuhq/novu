import {
  ProvidersIdEnum,
  ResourceOriginEnum,
  RuntimeIssue,
  SeverityLevelEnum,
  Slug,
  StepTypeEnum,
  WorkflowCreationSourceEnum,
  WorkflowPreferences,
} from '@novu/shared';
import type { JSONSchemaDto } from './json-schema-dto';
import { StepCreateDto, StepListResponseDto, StepResponseDto, StepUpdateDto } from './step.dto';
import { WorkflowStatusEnum } from './workflow-status-enum';

export class ControlsSchema {
  schema: JSONSchemaDto;
}

export type PatchWorkflowDto = {
  active?: boolean;
  name?: string;
  description?: string;
  tags?: string[];
  payloadSchema?: object;
  validatePayload?: boolean;
  isTranslationEnabled?: boolean;
};

export type ListWorkflowResponse = {
  workflows: WorkflowListResponseDto[];
  totalCount: number;
};

export type WorkflowListResponseDto = Pick<
  WorkflowResponseDto,
  | 'name'
  | 'tags'
  | 'updatedAt'
  | 'createdAt'
  | '_id'
  | 'workflowId'
  | 'slug'
  | 'status'
  | 'origin'
  | 'lastTriggeredAt'
  | 'isTranslationEnabled'
> & {
  stepTypeOverviews: StepTypeEnum[];
  steps: StepListResponseDto[];
};

/**
 * Per-provider overrides for a workflow-assigned agent.
 * Today only Novu Email (`novu-email-agent`) uses `replyTo`.
 */
export type WorkflowAgentProviderConfig = {
  /**
   * Novu-digestible inbound address for this agent (shared inbox or custom-domain
   * agent route). Used as the outbound email Reply-To so replies route to the agent.
   */
  replyTo?: string;
};

/**
 * Workflow-level agent assignment and optional per-provider config.
 * `null` on the parent field clears a previously saved assignment.
 */
export type WorkflowAgentConfig = {
  /** Public agent identifier (slug), not the Mongo `_id`. */
  identifier: string;
  providers?: Partial<Record<ProvidersIdEnum, WorkflowAgentProviderConfig>>;
};

export type WorkflowCommonsFields = {
  name: string;
  description?: string;
  tags?: string[];
  active?: boolean;
  validatePayload?: boolean;
  isTranslationEnabled?: boolean;
  severity?: SeverityLevelEnum;
  /**
   * Optional agent assignment used to route this workflow through an agent's
   * connected channels. `null` clears a previously saved assignment.
   */
  agent?: WorkflowAgentConfig | null;
};

export type PreferencesResponseDto = {
  user: WorkflowPreferences | null;
  default: WorkflowPreferences;
};

export type PreferencesRequestDto = {
  user: WorkflowPreferences | null;
  workflow?: WorkflowPreferences | null;
};

export type WorkflowResponseDto = WorkflowCommonsFields & {
  _id: string;
  workflowId: string;
  slug: Slug;
  updatedAt: string;
  createdAt: string;
  steps: StepResponseDto[];
  origin: ResourceOriginEnum;
  preferences: PreferencesResponseDto;
  status: WorkflowStatusEnum;
  issues?: Record<WorkflowCreateAndUpdateKeys, RuntimeIssue>;
  lastTriggeredAt?: string;
  payloadSchema?: Record<string, any>;
  payloadExample?: object;
};

export type WorkflowCreateAndUpdateKeys = keyof CreateWorkflowDto | keyof UpdateWorkflowDto;

export enum WorkflowIssueTypeEnum {
  MISSING_VALUE = 'MISSING_VALUE',
  MAX_LENGTH_ACCESSED = 'MAX_LENGTH_ACCESSED',
  WORKFLOW_ID_ALREADY_EXISTS = 'WORKFLOW_ID_ALREADY_EXISTS',
  DUPLICATED_VALUE = 'DUPLICATED_VALUE',
  LIMIT_REACHED = 'LIMIT_REACHED',
}

export type CreateWorkflowDto = WorkflowCommonsFields & {
  workflowId: string;

  steps: StepCreateDto[];

  __source: WorkflowCreationSourceEnum;

  preferences?: PreferencesRequestDto;

  payloadSchema?: object;
};

export type UpdateWorkflowDto = WorkflowCommonsFields & {
  /**
   * We allow to update workflow id only for code first workflows
   */
  workflowId?: string;

  steps: (StepCreateDto | StepUpdateDto)[];

  preferences: PreferencesRequestDto;

  origin?: ResourceOriginEnum;

  payloadSchema?: object;
};

export type UpsertWorkflowBody = Omit<UpdateWorkflowDto, 'steps'> & {
  steps: UpsertStepBody[];
};

export type UpsertStepBody = StepCreateBody | UpdateStepBody;
export type StepCreateBody = StepCreateDto;
export type UpdateStepBody = StepUpdateDto;

export type DuplicateWorkflowDto = Pick<CreateWorkflowDto, 'name' | 'tags' | 'description' | 'isTranslationEnabled'> & {
  workflowId?: string;
};

export function isStepCreateBody(step: UpsertStepBody): step is StepCreateDto {
  return step && typeof step === 'object' && !(step as UpdateStepBody)._id;
}

export function isStepUpdateBody(step: UpsertStepBody): step is UpdateStepBody {
  return step && typeof step === 'object' && !!(step as UpdateStepBody)._id;
}
