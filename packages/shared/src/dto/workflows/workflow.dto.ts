import { SeverityLevelEnum } from '../../consts';
import { ResourceOriginEnum, StepTypeEnum, WorkflowCreationSourceEnum, WorkflowPreferences } from '../../types';
import { Slug } from '../../types/utils';
import { RuntimeIssue } from '../../utils/issues';
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

export type WorkflowCommonsFields = {
  name: string;
  description?: string;
  tags?: string[];
  active?: boolean;
  validatePayload?: boolean;
  isTranslationEnabled?: boolean;
  severity?: SeverityLevelEnum;
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

  origin: ResourceOriginEnum;

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
