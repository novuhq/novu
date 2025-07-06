import { ArgumentsHost, ExceptionFilter, HttpException, HttpStatus, PayloadTooLargeException } from '@nestjs/common';
import { Response } from 'express';
import { CommandValidationException, PinoLogger, RequestLogRepository } from '@novu/application-generic';
import { randomUUID } from 'node:crypto';
import { captureException } from '@sentry/node';
import { ZodError } from 'zod';
import { InternalServerErrorException } from '@nestjs/common/exceptions/internal-server-error.exception';
import { UserSessionData } from '@novu/shared';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ErrorDto, ValidationErrorDto } from './error-dto';
import { retryWithBackoff } from './utils/payload-sanitizer';
import { buildLog } from './app/shared/utils/mappers';

export const ERROR_MSG_500 = `Internal server error, contact support and provide them with the errorId`;

class ValidationPipeError {
  response: { message: string[] | string };
}

export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly logger: PinoLogger,
    private readonly requestLogRepository: RequestLogRepository
  ) {}
  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const errorDto = this.buildErrorResponse(exception, request);

    // TODO: In same cases the statusCode is a string. We should investigate why this is happening.
    const statusCode = Number(errorDto.statusCode);
    if (statusCode >= 500) {
      this.logError(errorDto, exception);
    }

    // This is for backwards compatibility for clients waiting for the context elements to appear flat
    const finalResponse = { ...errorDto.ctx, ...errorDto };

    await this.createAnalyticsLog(ctx, request, statusCode, errorDto);

    response.status(statusCode).json(finalResponse);
  }

  private async createAnalyticsLog(ctx: HttpArgumentsHost, request: Request, statusCode: number, errorDto: ErrorDto) {
    const shouldRun = await this.shouldRun(ctx);

    if (!shouldRun) return;

    const req = ctx.getRequest();
    const user = req.user as UserSessionData;
    const basicLog = buildLog(request, statusCode, errorDto, user);

    try {
      if (basicLog) {
        await retryWithBackoff(() => this.requestLogRepository.insert(basicLog));
      }
    } catch (err) {
      this.logger.error({ err }, 'Failed to log analytics to ClickHouse after retries');
    }
  }

  private async shouldRun(ctx: HttpArgumentsHost): Promise<boolean> {
    const req = ctx.getRequest();

    // Check if the analytics metadata was set by the guard (AnalyticsLogsGuard)
    if (req._shouldLogAnalytics !== true) return false;

    const isEnabled = process.env.IS_ANALYTICS_LOGS_ENABLED === 'true';

    return isEnabled;
  }

  private logError(errorDto: ErrorDto, exception: unknown) {
    this.logger.error({
      /**
       * It's important to use `err` as the key, pino (the logger we use) will
       * log an empty object if the key is not `err`
       *
       * @see https://github.com/pinojs/pino/issues/819#issuecomment-611995074
       */
      err: exception,
      error: errorDto,
    });
  }

  private buildErrorDto(request: Request, statusCode: number, message: string, ctx?: Object | object): ErrorDto {
    return {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ctx,
    };
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorDto {
    if (exception instanceof HttpException && exception.name === 'ThrottlerException') {
      return this.handlerThrottlerException(request);
    }

    if (exception instanceof ZodError) {
      return this.handleZod(exception, request);
    }
    if (exception instanceof CommandValidationException) {
      return this.handleCommandValidation(exception, request);
    }
    if (this.isBadRequestWithMultipleExceptions(exception)) {
      return this.handleValidationPipeValidation(exception, request);
    }

    if (exception instanceof HttpException && !(exception instanceof InternalServerErrorException)) {
      return this.handleOtherHttpExceptions(exception, request);
    }

    if (this.isPayloadTooLargeError(exception)) {
      return this.handleOtherHttpExceptions(new PayloadTooLargeException(), request);
    }

    return this.buildA5xxError(request, exception);
  }

  private isPayloadTooLargeError(exception: unknown) {
    return exception?.constructor?.name === 'PayloadTooLargeError';
  }

  private isBadRequestWithMultipleExceptions(exception: unknown): exception is ValidationPipeError {
    // noinspection UnnecessaryLocalVariableJS
    const isBadRequestExceptionFromValidationPipe =
      exception instanceof Object &&
      safeHasProperty(exception, 'response') &&
      safeHasProperty((exception as any).response, 'message') &&
      Array.isArray((exception as any).response.message);

    return isBadRequestExceptionFromValidationPipe;
  }
  private buildA5xxError(request: Request, exception: unknown) {
    const errorDto500 = this.buildErrorDto(request, HttpStatus.INTERNAL_SERVER_ERROR, ERROR_MSG_500);

    return {
      ...errorDto500,
      errorId: this.getUuid(exception),
    };
  }

  private handleOtherHttpExceptions(exception: HttpException, request: Request): ErrorDto {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const { innerMsg, tempContext } = this.buildMsgAndContextForHttpError(response, status);

    return this.buildErrorDto(request, status || 500, innerMsg, tempContext);
  }

  private buildMsgAndContextForHttpError(response: string | object | { message: string }, status: number) {
    if (typeof response === 'string') {
      return { innerMsg: response as string };
    }

    if (safeHasProperty(response, 'message')) {
      const { message, ...ctx } = response as { message: string };

      return { innerMsg: message, tempContext: ctx };
    }
    if (typeof response === 'object' && response !== null) {
      return { innerMsg: `Api Exception Raised with status ${status}`, tempContext: response };
    }

    return { innerMsg: `Api Exception Raised with status ${status}` };
  }

  private handleCommandValidation(exception: CommandValidationException, request: Request): ValidationErrorDto {
    const errorDto = this.buildErrorDto(request, HttpStatus.UNPROCESSABLE_ENTITY, exception.message, {});

    return { ...errorDto, errors: exception.constraintsViolated };
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
  private handleZod(exception: ZodError, request: Request): ErrorDto {
    const ctx = {
      errors: exception.errors.map((err) => ({
        message: err.message,
        path: err.path,
      })),
    };

    return this.buildErrorDto(request, HttpStatus.BAD_REQUEST, 'Zod Validation Failed', ctx);
  }

  private handleValidationPipeValidation(exception: ValidationPipeError, request: Request) {
    const errorDto = this.buildErrorDto(request, HttpStatus.UNPROCESSABLE_ENTITY, 'Validation Error', {});

    return { ...errorDto, errors: { general: { messages: exception.response.message, value: 'No Value Recorded' } } };
  }

  private handlerThrottlerException(request: Request) {
    return this.buildErrorDto(request, HttpStatus.TOO_MANY_REQUESTS, 'API rate limit exceeded', {});
  }
}

function safeHasProperty(obj: unknown, property: string): boolean {
  return typeof obj === 'object' && obj !== null && property in obj;
}
