import { ErrorCodeEnum, HttpStatusEnum } from '../constants';

export class PlatformError extends Error {
  /**
   * HTTP status code.
   */
  public statusCode: HttpStatusEnum;

  /**
   * Additional data that can be used to provide more information about the error.
   */
  public data: unknown;

  public code: ErrorCodeEnum;

  constructor(statusCode: HttpStatusEnum, code: string, message: string) {
    super();
    this.data = { message };
    this.statusCode = statusCode;
    this.code = code as ErrorCodeEnum; // TODO: replace with ErrorCode types from Platform.
  }
}
