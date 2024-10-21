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

export class ExecutionEventPayloadInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_EVENT_PAYLOAD_INVALID_ERROR;

  constructor(workflowId: string, data: unknown) {
    super(`Workflow with id: \`${workflowId}\` has invalid \`payload\`. Please provide the correct event payload.`);
    this.data = data;
  }
}

export class ExecutionEventControlsInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_EVENT_CONTROL_INVALID_ERROR;

  constructor(workflowId: string, data: unknown) {
    super(`Workflow with id: \`${workflowId}\` has invalid \`controls\`. Please provide the correct event controls.`);
    this.data = data;
  }
}

export class ExecutionStateControlsInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_STATE_CONTROL_INVALID_ERROR;

  constructor(workflowId: string, stepId: string, data: unknown) {
    super(
      `Workflow with id: \`${workflowId}\` has an invalid state. Step with id: \`${stepId}\` has invalid \`controls\`. Please provide the correct step controls.`
    );
    this.data = data;
  }
}

export class ExecutionStateOutputInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_STATE_OUTPUT_INVALID_ERROR;

  constructor(workflowId: string, stepId: string, data: unknown) {
    super(
      `Workflow with id: \`${workflowId}\` has an invalid state. Step with id: \`${stepId}\` has invalid output. Please provide the correct step output.`
    );
    this.data = data;
  }
}

export class ExecutionStateResultInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_STATE_RESULT_INVALID_ERROR;

  constructor(workflowId: string, stepId: string, data: unknown) {
    super(
      `Workflow with id: \`${workflowId}\` has an invalid state. Step with id: \`${stepId}\` has invalid result. Please provide the correct step result.`
    );
    this.data = data;
  }
}

export class StepControlCompilationFailedError extends BadRequestError {
  code = ErrorCodeEnum.STEP_CONTROL_COMPILATION_FAILED_ERROR;

  constructor(workflowId: string, stepId: string, data: unknown) {
    super(
      `Workflow with id: \`${workflowId}\` has invalid controls syntax in step with id: \`${stepId}\`. Please correct step control syntax.`
    );
    this.data = data;
  }
}

export class ExecutionProviderOutputInvalidError extends BadRequestError {
  code = ErrorCodeEnum.EXECUTION_PROVIDER_OUTPUT_INVALID_ERROR;

  constructor(workflowId: string, stepId: string, providerId: string, data: unknown) {
    super(
      `Workflow with id: \`${workflowId}\` has an invalid state. Step with id: \`${stepId}\` and provider with id: \`${providerId}\` has invalid output. Please provide the correct provider output.`
    );
    this.data = data;
  }
}

export class WorkflowPayloadInvalidError extends BadRequestError {
  code = ErrorCodeEnum.WORKFLOW_PAYLOAD_INVALID_ERROR;

  constructor(workflowId: string, data: unknown) {
    super(`Workflow with id: \`${workflowId}\` has invalid \`payload\`. Please provide the correct payload.`);
    this.data = data;
  }
}
