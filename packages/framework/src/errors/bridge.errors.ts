import { ErrorCodeEnum, HttpStatusEnum } from '../constants';
import { ServerError } from './base.errors';

/**
 * A `BridgeError` is an unexpected error that occurs within the Bridge application.
 *
 * This error is used to wrap unknown errors that occur within the Bridge application,
 * such as errors due to unsupported runtime environments.
 */
export class BridgeError extends ServerError {
  statusCode = HttpStatusEnum.INTERNAL_SERVER_ERROR;
  code = ErrorCodeEnum.BRIDGE_ERROR;

  constructor(cause: unknown) {
    super(`Unknown BridgeError`, { cause });
  }
}
