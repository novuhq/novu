import { testErrorCodeEnumValidity } from '../types/error.types';

export enum ErrorCodeEnum {
  WORKFLOW_NOT_FOUND_ERROR = 'WorkflowNotFoundError',
  WORKFLOW_ALREADY_EXISTS_ERROR = 'WorkflowAlreadyExistsError',
  WORKFLOW_EXECUTION_FAILED_ERROR = 'WorkflowExecutionFailedError',
  EXECUTION_STATE_OUTPUT_INVALID_ERROR = 'ExecutionStateOutputInvalidError',
  EXECUTION_STATE_RESULT_INVALID_ERROR = 'ExecutionStateResultInvalidError',
  EXECUTION_PROVIDER_OUTPUT_INVALID_ERROR = 'ExecutionProviderOutputInvalidError',
  PROVIDER_NOT_FOUND_ERROR = 'ProviderNotFoundError',
  PROVIDER_EXECUTION_FAILED_ERROR = 'ProviderExecutionFailedError',
  STEP_NOT_FOUND_ERROR = 'StepNotFoundError',
  STEP_ALREADY_EXISTS_ERROR = 'StepAlreadyExistsError',
  STEP_EXECUTION_FAILED_ERROR = 'StepExecutionFailedError',
  EXECUTION_STATE_CORRUPT_ERROR = 'ExecutionStateCorruptError',
  EXECUTION_EVENT_PAYLOAD_INVALID_ERROR = 'ExecutionEventPayloadInvalidError',
  EXECUTION_EVENT_CONTROL_INVALID_ERROR = 'ExecutionEventControlInvalidError',
  EXECUTION_STATE_CONTROL_INVALID_ERROR = 'ExecutionStateControlInvalidError',
  METHOD_NOT_ALLOWED_ERROR = 'MethodNotAllowedError',
  INVALID_ACTION_ERROR = 'InvalidActionError',
  MISSING_SECRET_KEY_ERROR = 'MissingSecretKeyError',
  SIGNATURE_MISMATCH_ERROR = 'SignatureMismatchError',
  SIGNATURE_NOT_FOUND_ERROR = 'SignatureNotFoundError',
  SIGNATURE_INVALID_ERROR = 'SignatureInvalidError',
  SIGNATURE_EXPIRED_ERROR = 'SignatureExpiredError',
  SIGNING_KEY_NOT_FOUND_ERROR = 'SigningKeyNotFoundError',
  PLATFORM_ERROR = 'PlatformError',
  SIGNATURE_VERSION_INVALID_ERROR = 'SignatureVersionInvalidError',
  WORKFLOW_PAYLOAD_INVALID_ERROR = 'WorkflowPayloadInvalidError',
}

testErrorCodeEnumValidity(ErrorCodeEnum);
