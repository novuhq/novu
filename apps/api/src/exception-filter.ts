import { ArgumentsHost, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PinoLogger } from '@novu/application-generic';
import { randomUUID } from 'node:crypto';
import { captureException } from '@sentry/node';

export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.getResponseMetadata(exception);
    const responseBody = this.buildResponseBody(status, request, message, exception);

    response.status(status).json(responseBody);
  }

  private buildResponseBody(
    status: number,
    request: Request,
    message: string | object | Object,
    exception: unknown
  ): ErrorDto {
    const responseBody = this.buildBaseResponseBody(status, request, message);
    if (status !== HttpStatus.INTERNAL_SERVER_ERROR) {
      return message instanceof Object ? { ...responseBody, ...message } : responseBody;
    }

    return this.build500Error(exception, responseBody);
  }

  private build500Error(
    exception: unknown,
    responseBody: {
      path: string;
      message: string | object | Object;
      statusCode: number;
      timestamp: string;
    }
  ) {
    const uuid = this.getUuid(exception);
    this.logger.error(
      { exception, errorId: uuid, stack: (exception as Error)?.stack },
      `Unexpected exception thrown`,
      'Exception'
    );

    return { ...responseBody, errorId: uuid };
  }

  private buildBaseResponseBody(status: number, request: Request, message: string | object | Object) {
    return {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };
  }

  private getResponseMetadata(exception: unknown): { status: number; message: string | object | Object } {
    let status: number;
    let message: string | object;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();

      return { status, message };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: `Internal server error, contact support and provide them with the errorId`,
    };
  }
  private getUuid(exception: unknown) {
    if (process.env.SENTRY_DSN) {
      try {
        return captureException(exception);
      } catch (e) {
        return randomUUID();
      }
    } else {
      return randomUUID();
    }
  }
}

/**
 * Interface representing the structure of an error response.
 */
export class ErrorDto {
  statusCode: number;

  timestamp: string;

  /**
   * Optional unique identifier for the error, useful for tracking using sentry and newrelic, only available for 500
   */
  errorId?: string;

  path: string;

  message: string | object;
}
