import { ErrorCodeEnum } from '@novu/shared';
import { InternalServerError } from './base.errors';

export class PlatformError extends InternalServerError {
  code = ErrorCodeEnum.PLATFORM_ERROR;

  message = 'Something went wrong. Please try again later.';
}
