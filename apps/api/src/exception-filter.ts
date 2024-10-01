import { ArgumentsHost, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PinoLogger } from '@novu/application-generic';
import { randomUUID } from 'node:crypto';
import { captureException } from '@sentry/node';

export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly pinoLogger: PinoLogger) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.getResponseMetadata(exception);
    const responseBOdy = this.buildResponseBody(status, request, message, exception);

    response.status(status).json(responseBOdy);
  }

  private buildResponseBody(
    status: number,
    request: Request,
    message: string | object | Object,
    exception: unknown
  ): ErrorDto {
    let responseBody = this.buildBaseResponseBody(status, request, message);
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      const uuid = getUuid(exception);
      this.pinoLogger.error(`[${uuid}] Service thrown an unexpected exception: `, formatError(exception));

      return { ...responseBody, errorId: uuid };
    }
    if (message instanceof Object) {
      responseBody = { ...responseBody, ...message };
    }

    return responseBody;
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
      message: `Internal server error, contact support and provide them with the error_id
      }]`,
    };
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `
      Error: ${error.message}
      Stack: ${error.stack || 'No stack trace available'}
    `;
  } else {
    return `
      Unknown error: ${JSON.stringify(error, null, 2)}
    `;
  }
}
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface ErrorDto {
  statusCode: number;
  timestamp: string;
  errorId?: string;
  path: string;
  message: string | object;
}
function getUuid(exception: unknown) {
  if (process.env.SENTRY_DSN) {
    return captureException(exception);
  } else {
    return randomUUID();
  }
}
