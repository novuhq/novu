/* eslint-disable max-len */
import { ErrorCodeEnum } from '../constants';
import { BadRequestError } from './base.errors';

export class ExecutionStateCorruptError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_STATE_CORRUPT_ERROR;

  constructor(workflowId: string, stepId: string) {
    super(
      `Workflow with id: \`${workflowId}\` has a corrupt state. Step with id: \`${stepId}\` does not exist. Please provide the missing state.`
    );
    this.data = { workflowId, stepId };
  }
}

export class ExecutionEventDataInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_EVENT_DATA_INVALID_ERROR;

  constructor(workflowId: string, data: any) {
    super(`Workflow with id: \`${workflowId}\` has invalid \`data\`. Please provide the correct event data.`);
    this.data = data;
  }
}

export class ExecutionEventInputInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_EVENT_INPUT_INVALID_ERROR;

  constructor(workflowId: string, data: any) {
    super(`Workflow with id: \`${workflowId}\` has invalid \`inputs\`. Please provide the correct event inputs.`);
    this.data = data;
  }
}

export class ExecutionStateInputInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_STATE_INPUT_INVALID_ERROR;

  constructor(workflowId: string, stepId: string, data: any) {
    super(
      `Workflow with id: \`${workflowId}\` has an invalid state. Step with id: \`${stepId}\` has invalid input. Please provide the correct step input.`
    );
    this.data = data;
  }
}

export class ExecutionStateOutputInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_STATE_OUTPUT_INVALID_ERROR;

  constructor(workflowId: string, stepId: string, data: any) {
    super(
      `Workflow with id: \`${workflowId}\` has an invalid state. Step with id: \`${stepId}\` has invalid output. Please provide the correct step output.`
    );
    this.data = data;
  }
}

export class ExecutionStateResultInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_STATE_RESULT_INVALID_ERROR;

  constructor(workflowId: string, stepId: string, data: any) {
    super(
      `Workflow with id: \`${workflowId}\` has an invalid state. Step with id: \`${stepId}\` has invalid result. Please provide the correct step result.`
    );
    this.data = data;
  }
}

export class ExecutionProviderOutputInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_PROVIDER_OUTPUT_INVALID_ERROR;

  constructor(workflowId: string, stepId: string, providerId: string, data: any) {
    super(
      `Workflow with id: \`${workflowId}\` has an invalid state. Step with id: \`${stepId}\` and provider with id: \`${providerId}\` has invalid output. Please provide the correct provider output.`
    );
    this.data = data;
  }
}
