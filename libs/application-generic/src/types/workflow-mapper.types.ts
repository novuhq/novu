import { UserEntity } from '@novu/dal';
import {
  ResourceOriginEnum,
  ResourceTypeEnum,
  SeverityLevelEnum,
  StepIssues,
  StepTypeEnum,
  WorkflowPreferences,
  WorkflowStatusEnum,
} from '@novu/shared';

export interface WorkflowTriggerLike {
  identifier: string;
}

/** Fields read by `toResponseWorkflowDto` / `computeOrigin`. */
export interface WorkflowForResponseMapper {
  _id: string;
  name: string;
  description?: string;
  tags: string[];
  active: boolean;
  triggers: WorkflowTriggerLike[];
  type?: ResourceTypeEnum;
  origin?: ResourceOriginEnum;
  status?: WorkflowStatusEnum;
  issues?: Record<string, unknown[]>;
  lastPublishedAt?: string;
  lastPublishedBy?: UserEntity;
  updatedAt?: string;
  createdAt?: string;
  updatedBy?: UserEntity;
  lastTriggeredAt?: string;
  payloadSchema?: unknown;
  validatePayload?: boolean;
  isTranslationEnabled?: boolean;
  severity?: SeverityLevelEnum;
  agent?: {
    identifier: string;
    providers?: Record<string, { replyTo?: string }>;
  } | null;
}

export interface WorkflowWithPreferencesForMapper extends WorkflowForResponseMapper {
  userPreferences: WorkflowPreferences | null;
  defaultPreferences: WorkflowPreferences;
}

export interface StepTemplateForMapper {
  type?: StepTypeEnum;
  controls?: {
    schema?: unknown;
    uiSchema?: unknown;
  };
  stepResolverHash?: string;
}

/** Fields read by `BuildStepDataUsecase.mapToStepResponse`. */
export interface StepForResponseMapper {
  name?: string;
  _templateId: string;
  stepId?: string;
  template?: StepTemplateForMapper;
  issues?: StepIssues;
}

/** Fields read by `generatePayloadExample`. */
export interface WorkflowForPayloadExample {
  payloadSchema?: unknown;
  origin?: ResourceOriginEnum;
}

/** Fields read by `BuildVariableSchemaUsecase` for virtual workflows. */
export interface StepForVariableSchema {
  _id?: string;
  stepId?: string;
  _templateId: string;
  template?: { type?: StepTypeEnum };
}

export interface WorkflowForVariableSchema {
  _id: string;
  payloadSchema?: unknown;
  steps: StepForVariableSchema[];
}
