import { HttpStatusEnum } from '../constants';
import { ErrorCodeEnum } from '../constants/error.constants';

/**
 * Base error class for all Echo errors.
 */
export abstract class EchoError extends Error {
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

export abstract class NotFoundError extends EchoError {
  statusCode = HttpStatusEnum.NOT_FOUND;
}

export abstract class BadRequestError extends EchoError {
  statusCode = HttpStatusEnum.BAD_REQUEST;
}

export abstract class UnauthorizedError extends EchoError {
  statusCode = HttpStatusEnum.UNAUTHORIZED;
}

export abstract class InternalServerError extends EchoError {
  statusCode = HttpStatusEnum.INTERNAL_SERVER_ERROR;
}

export abstract class ConflictError extends EchoError {
  statusCode = HttpStatusEnum.CONFLICT;
}

export abstract class ForbiddenError extends EchoError {
  statusCode = HttpStatusEnum.FORBIDDEN;
}
