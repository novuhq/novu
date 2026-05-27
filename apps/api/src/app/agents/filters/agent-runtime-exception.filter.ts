import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Injectable } from '@nestjs/common';
import {
  AgentRuntimeBadRequestError,
  AgentRuntimeError,
  AgentRuntimeForbiddenError,
  AgentRuntimeNetworkError,
  AgentRuntimeNotFoundError,
  AgentRuntimeOverloadedError,
  AgentRuntimeRateLimitedError,
  AgentRuntimeServiceUnavailableError,
  AgentRuntimeTimeoutError,
  AgentRuntimeUnauthorizedError,
  PinoLogger,
} from '@novu/application-generic';
import type { Response } from 'express';
import { captureAgentException } from '../utils/capture-agent-sentry';

function httpStatusFromError(err: AgentRuntimeError): number {
  if (err instanceof AgentRuntimeUnauthorizedError) return HttpStatus.UNAUTHORIZED;
  if (err instanceof AgentRuntimeForbiddenError) return HttpStatus.FORBIDDEN;
  if (err instanceof AgentRuntimeNotFoundError) return HttpStatus.CONFLICT;
  if (err instanceof AgentRuntimeRateLimitedError) return HttpStatus.TOO_MANY_REQUESTS;
  if (
    err instanceof AgentRuntimeOverloadedError ||
    err instanceof AgentRuntimeServiceUnavailableError ||
    err instanceof AgentRuntimeTimeoutError ||
    err instanceof AgentRuntimeNetworkError
  ) {
    return HttpStatus.SERVICE_UNAVAILABLE;
  }
  if (err instanceof AgentRuntimeBadRequestError) return HttpStatus.BAD_REQUEST;

  return HttpStatus.BAD_GATEWAY;
}

function codeFromError(err: AgentRuntimeError): string {
  if (err instanceof AgentRuntimeNotFoundError) {
    return 'AGENT_RUNTIME_DRIFT';
  }

  return err.code;
}

@Injectable()
@Catch(AgentRuntimeError)
export class AgentRuntimeExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: AgentRuntimeError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode = httpStatusFromError(exception);
    const code = codeFromError(exception);

    if (statusCode !== HttpStatus.UNAUTHORIZED && statusCode !== HttpStatus.BAD_REQUEST) {
      this.logger.error(
        { code, providerId: exception.providerId, requestId: exception.requestId, message: exception.message },
        'Agent runtime provider error'
      );
      captureAgentException(exception, {
        component: 'agent-runtime-exception-filter',
        operation: 'provider-error',
        extra: {
          code,
          providerId: exception.providerId,
          requestId: exception.requestId,
          statusCode,
        },
      });
    }

    if (exception instanceof AgentRuntimeRateLimitedError) {
      const retryAfterSeconds = Math.ceil(exception.retryAfterMs / 1000);
      response.setHeader('Retry-After', String(retryAfterSeconds));
    }

    response.status(statusCode).json({
      statusCode,
      code,
      providerId: exception.providerId,
      message: exception.message,
      ...(exception instanceof AgentRuntimeRateLimitedError ? { retryAfterMs: exception.retryAfterMs } : {}),
      ...(exception.requestId ? { requestId: exception.requestId } : {}),
    });
  }
}
