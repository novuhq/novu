import { createHmac } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { createLiquidEngine, ExecuteOutput, HttpQueryKeysEnum, State } from '@novu/framework/internal';
import got, { HTTPError } from 'got';
import { InstrumentUsecase } from '../../instrumentation';
import { PinoLogger } from '../../logging';
import { RETRYABLE_ERROR_CODES } from '../../services/http-client';
import { sanitizeHtmlInObject } from '../../services/sanitize/sanitizer.service';
import {
  BridgeError,
  ExecuteBridgeRequestCommand,
  ProcessError,
} from '../execute-bridge-request/execute-bridge-request.command';

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

type StepResolverResponse = {
  outputs: Record<string, unknown>;
  providers?: Record<string, unknown>;
  options: { skip: boolean };
  metadata: {
    status: string;
    error: boolean;
    duration: number;
    stepType?: string;
    disableOutputSanitization?: boolean;
  };
};

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
    const normalizedEvent = (command.event ?? {}) as Record<string, unknown>;
    const compiledEvent = await this.compileControlValues(normalizedEvent, url, command.processError);
    const headers = this.buildRequestHeaders(compiledEvent, hmacSecret);

    this.logger.debug(
      { url, stepResolverHash: command.stepResolverHash, workflowId, stepId },
      'Making step resolver request'
    );

    try {
      const response = await got
        .post(url, {
          json: compiledEvent,
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

      const executeOutput = this.transformToExecuteOutput(response, duration);

      return this.sanitizeOutputsIfNeeded(
        executeOutput,
        response.metadata.stepType,
        response.metadata.disableOutputSanitization
      );
    } catch (error) {
      await this.handleResponseError(error, url, command.stepResolverHash, command.processError);
    }
  }

  private sanitizeOutputsIfNeeded(
    result: ExecuteOutput,
    stepType?: string,
    disableOutputSanitization?: boolean
  ): ExecuteOutput {
    if (disableOutputSanitization) {
      return result;
    }

    const sanitizableTypes = ['email', 'in_app'];
    if (stepType && sanitizableTypes.includes(stepType)) {
      return {
        ...result,
        outputs: sanitizeHtmlInObject(result.outputs as Record<string, unknown>),
      };
    }

    return result;
  }

  private transformToExecuteOutput(response: StepResolverResponse, duration: number): ExecuteOutput {
    return {
      outputs: response.outputs,
      providers: (response.providers ?? {}) as ExecuteOutput['providers'],
      options: {
        skip: response.options?.skip === true,
      },
      metadata: {
        status: 'success',
        error: false,
        duration,
      },
    };
  }

  private async compileControlValues(
    event: Record<string, unknown>,
    url: string,
    processError?: ProcessError
  ): Promise<Record<string, unknown>> {
    const controls = (event.controls ?? {}) as Record<string, unknown>;

    if (Object.keys(controls).length === 0) {
      return event;
    }

    try {
      const liquidEngine = createLiquidEngine();
      const parsedTemplate = liquidEngine.parse(JSON.stringify(controls));

      const stateArray = Array.isArray(event.state) ? (event.state as State[]) : [];
      const stepsMap = stateArray.reduce<Record<string, Record<string, unknown>>>((acc, state) => {
        acc[state.stepId] = state.outputs ?? {};

        return acc;
      }, {});

      const renderVariables = {
        payload: (event.payload ?? {}) as Record<string, unknown>,
        subscriber: (event.subscriber ?? {}) as Record<string, unknown>,
        context: (event.context ?? {}) as Record<string, unknown>,
        steps: stepsMap,
        env: (event.env ?? {}) as Record<string, string>,
      };

      const compiledString = await liquidEngine.render(parsedTemplate, renderVariables);

      return { ...event, controls: JSON.parse(compiledString) };
    } catch (cause) {
      const compilationError: BridgeError = {
        url,
        code: 'STEP_RESOLVER_CONTROL_COMPILATION_FAILED',
        message:
          cause instanceof Error
            ? `Step control compilation failed: ${cause.message}`
            : 'Step control compilation failed: invalid template syntax in control values',
        statusCode: HttpStatus.BAD_REQUEST,
        cause,
      };

      if (processError) {
        await processError(compilationError);
      }

      throw new StepResolverRequestError(compilationError);
    }
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

      if (statusCode === 400) {
        const parsedBody = this.tryParseBody(error.response.body);

        if (parsedBody?.error === 'INVALID_CONTROLS') {
          return {
            url,
            code: 'STEP_RESOLVER_INVALID_CONTROLS',
            message:
              typeof parsedBody.message === 'string' ? parsedBody.message : 'Step controls failed schema validation',
            statusCode,
            data: parsedBody.details ?? error.response.body,
            cause: error,
          };
        }
      }

      if (statusCode === 500) {
        const parsedBody = this.tryParseBody(error.response.body);

        if (parsedBody?.error === 'STEP_HANDLER_ERROR') {
          return {
            url,
            code: 'STEP_HANDLER_ERROR',
            message:
              typeof parsedBody.message === 'string' ? parsedBody.message : 'An error occurred in your template code',
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

  private tryParseBody(body: unknown): Record<string, unknown> | null {
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;

      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }

      return null;
    } catch {
      return null;
    }
  }
}
