import { HttpStatusCode } from './http-status-code';

export class HttpException extends Error {
  private statusCode: HttpStatusCode;
  constructor(statusCode: HttpStatusCode, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
