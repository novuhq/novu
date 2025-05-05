import type { StepResponseDto } from '@novu/shared';

export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  LOADING = 'loading',
}

export enum WorkflowIssueTypeEnum {
  MISSING_VARIABLE_IN_PAYLOAD = 'MISSING_VARIABLE_IN_PAYLOAD',
  VARIABLE_TYPE_MISMATCH = 'VARIABLE_TYPE_MISMATCH',
  MISSING_VALUE = 'MISSING_VALUE',
  WORKFLOW_ID_ALREADY_EXIST = 'WORKFLOW_ID_ALREADY_EXIST',
  STEP_ID_ALREADY_EXIST = 'STEP_ID_ALREADY_EXIST',
}

export type RuntimeIssue = {
  issueType: WorkflowIssueTypeEnum;
  variableName?: string;
  message: string;
};

export type Step = Pick<StepResponseDto, 'name' | 'type' | '_id' | 'stepId' | 'issues' | 'slug' | 'controls'>;

/**
 * Omit the `environment` field from the parameters of a function.
 * This is useful to in data-fetching hooks invoking the api client functions.
 */
export type OmitEnvironmentFromParameters<T extends (...args: any) => any> = Omit<Parameters<T>[0], 'environment'>;
