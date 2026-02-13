import { createHmac } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ExecuteOutput } from '@novu/framework/internal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import got, { HTTPError } from 'got';
import { InstrumentUsecase } from '../../instrumentation';
import { PinoLogger } from '../../logging';
import { CreateExecutionDetails, CreateExecutionDetailsCommand } from '../create-execution-details';
import { DetailEnum } from '../create-execution-details/types';
import { ExecuteStepResolverCommand, StepResolverError } from './execute-step-resolver.command';

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
  502: {
    code: 'STEP_RESOLVER_UNAVAILABLE',
    message: 'Step resolver worker unavailable',
  },
};

class StepResolverRequestError extends HttpException {
  constructor(stepResolverError: StepResolverError) {
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
export class ExecuteStepResolver {
  constructor(
    private logger: PinoLogger,
    private createExecutionDetails: CreateExecutionDetails
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: ExecuteStepResolverCommand): Promise<ExecuteOutput> {
    const startTime = performance.now();
    const dispatchUrl = process.env.STEP_RESOLVER_DISPATCH_URL;
    const hmacSecret = process.env.STEP_RESOLVER_HMAC_SECRET;

    if (!dispatchUrl) {
      throw new NotFoundException('Step resolver dispatch URL is not configured');
    }

    if (!hmacSecret) {
      throw new NotFoundException('Step resolver HMAC secret is not configured');
    }

    const url = this.buildResolverUrl(dispatchUrl, command.organizationId, command.stepResolverHash, command.stepId);

    const retriesLimit = command.retriesLimit ?? DEFAULT_RETRIES_LIMIT;
    const headers = this.buildRequestHeaders(command, hmacSecret);

    this.logger.debug({ url, stepResolverHash: command.stepResolverHash }, 'Making step resolver request');

    try {
      const response = await got
        .post(url, {
          json: command.payload,
          headers,
          timeout: { request: DEFAULT_TIMEOUT },
          retry: {
            limit: retriesLimit,
            methods: ['POST'],
            statusCodes: RETRYABLE_HTTP_CODES,
          },
        })
        .json<StepResolverResponse>();

      const duration = Math.round(performance.now() - startTime);

      return this.transformToExecuteOutput(response, duration);
    } catch (error) {
      await this.handleResponseError(error, url, command);
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

  private buildRequestHeaders(command: ExecuteStepResolverCommand, hmacSecret: string): Record<string, string> {
    const novuSignatureHeader = this.buildRequestSignature(command, hmacSecret);

    return {
      'Content-Type': 'application/json',
      'X-Novu-Signature': novuSignatureHeader,
    };
  }

  private buildRequestSignature(command: ExecuteStepResolverCommand, hmacSecret: string): string {
    const timestamp = Date.now();
    const bodyString = JSON.stringify(command.payload);
    const publicKey = `${timestamp}.${bodyString}`;
    const hmac = createHmac('sha256', hmacSecret).update(publicKey).digest('hex');

    return `t=${timestamp},v1=${hmac}`;
  }

  private buildResolverUrl(baseUrl: string, organizationId: string, stepResolverHash: string, stepId: string): string {
    const url = new URL(`/resolve/${organizationId}/sr-${stepResolverHash}/${encodeURIComponent(stepId)}`, baseUrl);

    return url.toString();
  }

  private async handleResponseError(error: unknown, url: string, command: ExecuteStepResolverCommand): Promise<never> {
    const stepResolverError = this.buildErrorResponse(error, url);

    await this.createExecutionDetails.execute({
      ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
      detail: DetailEnum.FAILED_STEP_RESOLVER_EXECUTION,
      source: ExecutionDetailsSourceEnum.INTERNAL,
      status: ExecutionDetailsStatusEnum.FAILED,
      isTest: false,
      isRetry: false,
      raw: JSON.stringify({
        stepResolverHash: command.stepResolverHash,
        url: stepResolverError.url,
        statusCode: stepResolverError.statusCode,
        message: stepResolverError.message,
        code: stepResolverError.code,
      }),
    });

    throw new StepResolverRequestError(stepResolverError);
  }

  private buildErrorResponse(error: unknown, url: string): StepResolverError {
    if (error instanceof HTTPError) {
      const statusCode = error.response.statusCode;
      const shouldLog = statusCode >= 500;

      if (shouldLog) {
        this.logger.error({ error, statusCode }, `Step resolver HTTP error: ${statusCode}`);
      }

      const mapping = HTTP_ERROR_MAPPINGS[statusCode];
      const code = mapping?.code ?? 'STEP_RESOLVER_HTTP_ERROR';
      const message = mapping?.message ?? `Step resolver returned status ${statusCode}`;

      return {
        url,
        code,
        message,
        statusCode,
        data: error.response.body,
        cause: error,
      };
    }

    this.logger.error({ error }, `Step resolver request failed: ${url}`);

    const isTimeout = typeof error === 'object' && error !== null && 'code' in error && error.code === 'ETIMEDOUT';

    return {
      url,
      code: isTimeout ? 'STEP_RESOLVER_TIMEOUT' : 'STEP_RESOLVER_ERROR',
      message: isTimeout ? 'Step resolver request timeout' : 'Step resolver request failed',
      statusCode: isTimeout ? HttpStatus.REQUEST_TIMEOUT : HttpStatus.INTERNAL_SERVER_ERROR,
      cause: error,
    };
  }
}
