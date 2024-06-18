import { ErrorCodeEnum, ResourceEnum } from '../constants';
import { ResourceExecutionFailed, ResourceNotFoundError } from './resource.errors';

export class ProviderNotFoundError extends ResourceNotFoundError {
  code = ErrorCodeEnum.PROVIDER_NOT_FOUND_ERROR;

  constructor(id: string) {
    super(ResourceEnum.PROVIDER, id);
  }
}

export class ProviderExecutionFailedError extends ResourceExecutionFailed {
  code = ErrorCodeEnum.PROVIDER_EXECUTION_FAILED_ERROR;

  constructor(id: string) {
    super(ResourceEnum.WORKFLOW, id);
  }
}
