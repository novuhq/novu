import { ErrorCodeEnum, HttpMethodEnum, HttpStatusEnum } from '../constants';
import { enumToPrettyString } from '../utils/string.utils';
import { BadRequestError, FrameworkError } from './base.errors';

export class MethodNotAllowedError extends FrameworkError {
  code = ErrorCodeEnum.METHOD_NOT_ALLOWED_ERROR;

  statusCode = HttpStatusEnum.METHOD_NOT_ALLOWED;

  message = `Method not allowed. Please use one of ${enumToPrettyString(HttpMethodEnum)}`;
}

export class InvalidActionError extends BadRequestError {
  code = ErrorCodeEnum.INVALID_ACTION_ERROR;

  constructor(action: string, allowedActions: Object) {
    super(`Invalid query string: \`action\`=\`${action}\`. Please use one of ${enumToPrettyString(allowedActions)}`);
  }
}

export class MissingSecretKeyError extends BadRequestError {
  code = ErrorCodeEnum.MISSING_SECRET_KEY_ERROR;

  constructor() {
    super(
      'Missing secret key. Set the `NOVU_SECRET_KEY` environment variable or pass `secretKey` to the client options.'
    );
  }
}
