import { ErrorCodeEnum, PostActionEnum, ResourceEnum } from '../constants';
import { ResourceConflictError, ResourceExecutionFailed, ResourceNotFoundError } from './resource.errors';

export class StepNotFoundError extends ResourceNotFoundError {
  code = ErrorCodeEnum.STEP_NOT_FOUND_ERROR;

  constructor(id: string) {
    super(ResourceEnum.STEP, id);
  }
}

export class StepAlreadyExistsError extends ResourceConflictError {
  code = ErrorCodeEnum.STEP_ALREADY_EXISTS_ERROR;

  constructor(id: string) {
    super(ResourceEnum.STEP, id);
  }
}

export class StepExecutionFailedError extends ResourceExecutionFailed {
  code = ErrorCodeEnum.STEP_EXECUTION_FAILED_ERROR;

  constructor(id: string, action: PostActionEnum, cause: unknown) {
    super(ResourceEnum.STEP, id, action, cause);
  }
}
