import { ErrorCodeEnum } from '../constants';
import { InternalServerError } from './base.errors';

export class BridgeError extends InternalServerError {
  code = ErrorCodeEnum.BRIDGE_ERROR;

  message = 'Something went wrong. Please try again later.';
}
