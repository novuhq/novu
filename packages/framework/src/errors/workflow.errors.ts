import { ErrorCodeEnum, ResourceEnum } from '../constants';
import { ResourceConflictError, ResourceNotFoundError } from './resource.errors';

export class WorkflowNotFoundError extends ResourceNotFoundError {
  code = ErrorCodeEnum.WORKFLOW_NOT_FOUND_ERROR;

  constructor(id: string) {
    super(ResourceEnum.WORKFLOW, id);
  }
}

export class WorkflowAlreadyExistsError extends ResourceConflictError {
  code = ErrorCodeEnum.WORKFLOW_ALREADY_EXISTS_ERROR;

  constructor(id: string) {
    super(ResourceEnum.WORKFLOW, id);
  }
}
