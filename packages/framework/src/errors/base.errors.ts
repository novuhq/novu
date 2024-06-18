import { HttpStatusEnum } from '../constants';
import { ErrorCodeEnum } from '../constants/error.constants';

/**
 * Base error class.
 */
export abstract class NovuError extends Error {
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

export abstract class NotFoundError extends NovuError {
  statusCode = HttpStatusEnum.NOT_FOUND;
}

export abstract class BadRequestError extends NovuError {
  statusCode = HttpStatusEnum.BAD_REQUEST;
}

export abstract class UnauthorizedError extends NovuError {
  statusCode = HttpStatusEnum.UNAUTHORIZED;
}

export abstract class InternalServerError extends NovuError {
  statusCode = HttpStatusEnum.INTERNAL_SERVER_ERROR;
}

export abstract class ConflictError extends NovuError {
  statusCode = HttpStatusEnum.CONFLICT;
}

export abstract class ForbiddenError extends NovuError {
  statusCode = HttpStatusEnum.FORBIDDEN;
}
