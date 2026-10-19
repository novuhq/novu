import { HttpStatusEnum } from '../constants';
import { ErrorCodeEnum } from '../constants/error.constants';

/**
 * Check if the object is a native error.
 *
 * This method relies on `Object.prototype.toString()` behavior. It is possible to obtain
 * an incorrect result when the object argument has a non `Error`-suffixed `name` property.
 *
 * @param object - The object to check.
 * @returns `true` if the object is a native error, `false` otherwise.
 */
export const isNativeError = (object: unknown): object is Error => {
  if (typeof object !== 'object' || object === null) {
    return false;
  }

  const proto = Object.getPrototypeOf(object);

  return proto?.constructor?.name.endsWith('Error') ?? false;
};

/**
 * Base error class.
 */
export abstract class FrameworkError extends Error {
  /**
   * HTTP status code.
   */
  public abstract readonly statusCode: HttpStatusEnum;

  /**
   * Additional data that can be used to provide more information about the error.
   */
  public data?: unknown;

  /**
   * The error code, which is used to identify the error type.
   */
  public abstract readonly code: ErrorCodeEnum;
}

export abstract class NotFoundError extends FrameworkError {
  statusCode = HttpStatusEnum.NOT_FOUND;
}

export abstract class BadRequestError extends FrameworkError {
  statusCode = HttpStatusEnum.BAD_REQUEST;
}

export abstract class UnauthorizedError extends FrameworkError {
  statusCode = HttpStatusEnum.UNAUTHORIZED;
}

export abstract class ServerError extends FrameworkError {
  data: {
    /**
     * The stack trace of the error.
     */
    stack: string;
  };

  constructor(message: string, { cause }: Partial<{ cause: unknown }> = {}) {
    if (isNativeError(cause)) {
      super(`${message}: ${cause.message}`);
      this.data = {
        stack: cause.stack ?? message,
      };
    } else {
      super(`${message}${cause ? `: ${JSON.stringify(cause, null, 2)}` : ''}`);
      this.data = {
        stack: message,
      };
    }
  }
}

export abstract class ConflictError extends FrameworkError {
  statusCode = HttpStatusEnum.CONFLICT;
}

export abstract class ForbiddenError extends FrameworkError {
  statusCode = HttpStatusEnum.FORBIDDEN;
}
