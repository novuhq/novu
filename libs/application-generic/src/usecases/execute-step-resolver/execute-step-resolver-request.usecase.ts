import { createHmac } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ExecuteOutput, HttpQueryKeysEnum } from '@novu/framework/internal';
import got, { HTTPError } from 'got';
import { InstrumentUsecase } from '../../instrumentation';
import { PinoLogger } from '../../logging';
import {
  BridgeError,
  ExecuteBridgeRequestCommand,
  ProcessError,
} from '../execute-bridge-request/execute-bridge-request.command';
import { RETRYABLE_ERROR_CODES } from '../execute-bridge-request/execute-framework-request.usecase';

export const DEFAULT_TIMEOUT = 30_000; // 30 seconds
export const DEFAULT_RETRIES_LIMIT = 2;
export const RETRYABLE_HTTP_CODES: number[] = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  503, // Service Unavailable
  504, // Gateway Timeout
  521, // CloudFlare web server is down
  522, // CloudFlare connection timed out
  524, // CloudFlare a timeout occurred
];

const HTTP_ERROR_MAPPINGS: Record<number, { code: string; message: string }> = {
  401: {
    code: 'STEP_RESOLVER_AUTHENTICATION_FAILED',
    message: 'Step resolver authentication failed',
  },
  404: {
    code: 'STEP_RESOLVER_NOT_FOUND',
    message: 'Step resolver worker not found',
  },
  413: {
    code: 'STEP_RESOLVER_PAYLOAD_TOO_LARGE',
    message: 'Step resolver payload too large',
  },
  500: {
    code: 'STEP_RESOLVER_HTTP_ERROR',
    message: 'Step resolver returned an internal error',
  },
  502: {
    code: 'STEP_RESOLVER_UNAVAILABLE',
    message: 'Step resolver worker unavailable',
  },
};

class StepResolverRequestError extends HttpException {
  constructor(stepResolverError: BridgeError) {
    super(
      {
        message: stepResolverError.message,
        code: stepResolverError.code,
        data: stepResolverError.data,
      },
      stepResolverError.statusCode,
      {
        cause: stepResolverError.cause,
      }
    );
  }
}

interface StepResolverResponse {
  subject: string;
  body: string;
}

@Injectable()
export class ExecuteStepResolverRequest {
  constructor(private logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: ExecuteBridgeRequestCommand): Promise<ExecuteOutput> {
    const startTime = performance.now();
    const dispatchUrl = process.env.STEP_RESOLVER_DISPATCH_URL;
    const hmacSecret = process.env.STEP_RESOLVER_HMAC_SECRET;

    if (!dispatchUrl) {
      throw new NotFoundException('Step resolver dispatch URL is not configured');
    }

    if (!hmacSecret) {
      throw new NotFoundException('Step resolver HMAC secret is not configured');
    }

    const workflowId = command.searchParams?.[HttpQueryKeysEnum.WORKFLOW_ID];
    const stepId = command.searchParams?.[HttpQueryKeysEnum.STEP_ID];

    if (!command.stepResolverHash || !workflowId || !stepId) {
      throw new NotFoundException(
        'stepResolverHash, searchParams.workflowId, and searchParams.stepId are required for Step Resolver'
      );
    }

    if (!command.organizationId) {
      throw new NotFoundException('organizationId is required for Step Resolver');
    }

    const url = this.buildResolverUrl(
      dispatchUrl,
      command.organizationId,
      command.stepResolverHash,
      workflowId,
      stepId
    );
    const retriesLimit = command.retriesLimit ?? DEFAULT_RETRIES_LIMIT;
    const normalizedEvent = command.event ?? {};
    const headers = this.buildRequestHeaders(normalizedEvent, hmacSecret);

    this.logger.debug(
      { url, stepResolverHash: command.stepResolverHash, workflowId, stepId },
      'Making step resolver request'
    );

    try {
      const response = await got
        .post(url, {
          json: normalizedEvent,
          headers,
          timeout: { request: DEFAULT_TIMEOUT },
          retry: {
            limit: retriesLimit,
            methods: ['POST'],
            statusCodes: RETRYABLE_HTTP_CODES,
            errorCodes: RETRYABLE_ERROR_CODES,
          },
        })
        .json<StepResolverResponse>();

      const duration = Math.round(performance.now() - startTime);

      return this.transformToExecuteOutput(response, duration);
    } catch (error) {
      await this.handleResponseError(error, url, command.stepResolverHash, command.processError);
    }
  }

  private transformToExecuteOutput(response: StepResolverResponse, duration: number): ExecuteOutput {
    return {
      outputs: {
        subject: response.subject,
        body: response.body,
      },
      options: {
        skip: false,
      },
      metadata: {
        status: 'success',
        error: false,
        duration,
      },
    };
  }

  private buildRequestHeaders(event: unknown, hmacSecret: string): Record<string, string> {
    const timestamp = Date.now();
    const bodyString = JSON.stringify(event);
    const publicKey = `${timestamp}.${bodyString}`;
    const hmac = createHmac('sha256', hmacSecret).update(publicKey).digest('hex');

    return {
      'Content-Type': 'application/json',
      'X-Novu-Signature': `t=${timestamp},v1=${hmac}`,
    };
  }

  private buildResolverUrl(
    baseUrl: string,
    organizationId: string,
    stepResolverHash: string,
    workflowId: string,
    stepId: string
  ): string {
    const url = new URL(
      `/resolve/${organizationId}/sr-${stepResolverHash}/${encodeURIComponent(workflowId)}/${encodeURIComponent(stepId)}`,
      baseUrl
    );

    return url.toString();
  }

  private async handleResponseError(
    error: unknown,
    url: string,
    stepResolverHash: string,
    processError?: ProcessError
  ): Promise<never> {
    const stepResolverError = this.buildErrorResponse(error, url, stepResolverHash);

    if (processError) {
      await processError(stepResolverError);
    }

    throw new StepResolverRequestError(stepResolverError);
  }

  private buildErrorResponse(error: unknown, url: string, stepResolverHash: string): BridgeError {
    if (error instanceof HTTPError) {
      const statusCode = error.response.statusCode;

      if (statusCode === 500) {
        const parsedBody = this.tryParseBody(error.response.body);

        if (parsedBody?.error === 'STEP_HANDLER_ERROR') {
          return {
            url,
            code: 'STEP_HANDLER_ERROR',
            message: parsedBody.message ?? 'An error occurred in your template code',
            statusCode,
            cause: error,
          };
        }
      }

      if (statusCode >= 500) {
        this.logger.error({ error, statusCode, url, stepResolverHash }, `Step resolver HTTP error: ${statusCode}`);
      }

      const mapping = HTTP_ERROR_MAPPINGS[statusCode];
      const code = mapping?.code ?? 'STEP_RESOLVER_HTTP_ERROR';
      const message = mapping?.message ?? `Step resolver returned status ${statusCode}`;

      return {
        url,
        code,
        message: `${message}: ${url}`,
        statusCode,
        data: error.response.body,
        cause: error,
      };
    }

    this.logger.error({ error, url, stepResolverHash }, `Step resolver request failed: ${url}`);

    const isTimeout = typeof error === 'object' && error !== null && 'code' in error && error.code === 'ETIMEDOUT';

    return {
      url,
      code: isTimeout ? 'STEP_RESOLVER_TIMEOUT' : 'STEP_RESOLVER_ERROR',
      message: isTimeout ? `Step resolver request timeout: ${url}` : `Step resolver request failed: ${url}`,
      statusCode: isTimeout ? HttpStatus.REQUEST_TIMEOUT : HttpStatus.INTERNAL_SERVER_ERROR,
      cause: error,
    };
  }

  private tryParseBody(body: unknown): Record<string, string> | null {
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;

      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }

      return null;
    } catch {
      return null;
    }
  }
}
