import { ErrorCodeEnum, HttpMethodEnum, HttpStatusEnum } from '../constants';
import { enumToPrettyString } from '../utils';
import { BadRequestError, EchoError } from './base.errors';

export class MethodNotAllowedError extends EchoError {
  code = ErrorCodeEnum.METHOD_NOT_ALLOWED_ERROR;

  statusCode = HttpStatusEnum.METHOD_NOT_ALLOWED;

  message = `Method not allowed. Please use one of ${enumToPrettyString(HttpMethodEnum)}`;
}

export class InvalidActionError extends BadRequestError {
  code = ErrorCodeEnum.INVALID_ACTION_ERROR;

  // eslint-disable-next-line  @typescript-eslint/ban-types
  constructor(action: string, allowedActions: Object) {
    super(`Invalid query string: \`action\`=\`${action}\`. Please use one of ${enumToPrettyString(allowedActions)}`);
  }
}

export class MissingApiKeyError extends BadRequestError {
  code = ErrorCodeEnum.MISSING_API_KEY_ERROR;

  constructor() {
    super(`API Key is missing. Please add the API Key during Echo client initialization.`);
  }
}
