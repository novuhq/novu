import { testErrorCodeEnumValidity } from '../types/error.types';

export enum ErrorCodeEnum {
  BRIDGE_ERROR = 'BridgeError',
  EXECUTION_EVENT_CONTROL_INVALID_ERROR = 'ExecutionEventControlInvalidError',
  EXECUTION_EVENT_PAYLOAD_INVALID_ERROR = 'ExecutionEventPayloadInvalidError',
  EXECUTION_PROVIDER_OUTPUT_INVALID_ERROR = 'ExecutionProviderOutputInvalidError',
  EXECUTION_STATE_CONTROL_INVALID_ERROR = 'ExecutionStateControlInvalidError',
  EXECUTION_STATE_CORRUPT_ERROR = 'ExecutionStateCorruptError',
  EXECUTION_STATE_OUTPUT_INVALID_ERROR = 'ExecutionStateOutputInvalidError',
  EXECUTION_STATE_RESULT_INVALID_ERROR = 'ExecutionStateResultInvalidError',
  INVALID_ACTION_ERROR = 'InvalidActionError',
  METHOD_NOT_ALLOWED_ERROR = 'MethodNotAllowedError',
  MISSING_DEPENDENCY_ERROR = 'MissingDependencyError',
  MISSING_SECRET_KEY_ERROR = 'MissingSecretKeyError',
  PROVIDER_EXECUTION_FAILED_ERROR = 'ProviderExecutionFailedError',
  PROVIDER_NOT_FOUND_ERROR = 'ProviderNotFoundError',
  SIGNATURE_EXPIRED_ERROR = 'SignatureExpiredError',
  SIGNATURE_INVALID_ERROR = 'SignatureInvalidError',
  SIGNATURE_MISMATCH_ERROR = 'SignatureMismatchError',
  SIGNATURE_NOT_FOUND_ERROR = 'SignatureNotFoundError',
  SIGNATURE_VERSION_INVALID_ERROR = 'SignatureVersionInvalidError',
  SIGNING_KEY_NOT_FOUND_ERROR = 'SigningKeyNotFoundError',
  STEP_ALREADY_EXISTS_ERROR = 'StepAlreadyExistsError',
  STEP_CONTROL_COMPILATION_FAILED_ERROR = 'StepControlCompilationFailedError',
  STEP_EXECUTION_FAILED_ERROR = 'StepExecutionFailedError',
  STEP_NOT_FOUND_ERROR = 'StepNotFoundError',
  WORKFLOW_ALREADY_EXISTS_ERROR = 'WorkflowAlreadyExistsError',
  WORKFLOW_NOT_FOUND_ERROR = 'WorkflowNotFoundError',
  WORKFLOW_PAYLOAD_INVALID_ERROR = 'WorkflowPayloadInvalidError',
}

testErrorCodeEnumValidity(ErrorCodeEnum);
