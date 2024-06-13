import { HttpStatusEnum } from '../constants';
import { ErrorCodeEnum } from '../constants/error.constants';

/**
 * Base error class.
 */
export abstract class BaseError extends Error {
  /**
   * HTTP status code.
   */
  public abstract readonly statusCode: HttpStatusEnum;

  /**
   * Additional data that can be used to provide more information about the error.
   */
  public data?: any;

  /**
   * The error code, which is used to identify the error type.
   */
  public abstract readonly code: ErrorCodeEnum;
}

export abstract class NotFoundError extends BaseError {
  statusCode = HttpStatusEnum.NOT_FOUND;
}

export abstract class BadRequestError extends BaseError {
  statusCode = HttpStatusEnum.BAD_REQUEST;
}

export abstract class UnauthorizedError extends BaseError {
  statusCode = HttpStatusEnum.UNAUTHORIZED;
}

export abstract class InternalServerError extends BaseError {
  statusCode = HttpStatusEnum.INTERNAL_SERVER_ERROR;
}

export abstract class ConflictError extends BaseError {
  statusCode = HttpStatusEnum.CONFLICT;
}

export abstract class ForbiddenError extends BaseError {
  statusCode = HttpStatusEnum.FORBIDDEN;
}
