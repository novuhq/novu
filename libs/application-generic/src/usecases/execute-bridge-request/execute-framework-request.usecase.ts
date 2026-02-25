import { createHmac } from 'node:crypto';
import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import {
  GetActionEnum,
  HttpHeaderKeysEnum,
  HttpQueryKeysEnum,
  isFrameworkError,
  PostActionEnum,
} from '@novu/framework/internal';
import { ResourceOriginEnum } from '@novu/shared';
import got, {
  CacheError,
  HTTPError,
  MaxRedirectsError,
  OptionsOfTextResponseBody,
  ParseError,
  ReadError,
  RequestError,
  TimeoutError,
  UnsupportedProtocolError,
  UploadError,
} from 'got';
import { HttpRequestHeaderKeysEnum } from '../../http';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { PinoLogger } from '../../logging';
import { BRIDGE_EXECUTION_ERROR } from '../../utils';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '../get-decrypted-secret-key';
import { BridgeError, ExecuteBridgeRequestCommand, ExecuteBridgeRequestDto } from './execute-bridge-request.command';

const inTestEnv = process.env.NODE_ENV === 'test';

const RETRY_BASE_INTERVAL_IN_MS = inTestEnv ? 50 : 500;

export const DEFAULT_TIMEOUT = 5_000; // 5 seconds
export const DEFAULT_RETRIES_LIMIT = 3;
export const RETRYABLE_HTTP_CODES: number[] = [
  408, // Request Timeout
  429, // Too Many Requests
  500, // Internal Server Error
  503, // Service Unavailable
  504, // Gateway Timeout
  // https://developers.cloudflare.com/support/troubleshooting/cloudflare-errors/troubleshooting-cloudflare-5xx-errors/
  521, // CloudFlare web server is down
  522, // CloudFlare connection timed out
  524, // CloudFlare a timeout occurred
];
export const RETRYABLE_ERROR_CODES: string[] = [
  'EAI_AGAIN', //    DNS resolution failed, retry
  'ECONNREFUSED', // Connection refused by the server
  'ECONNRESET', //   Connection was forcibly closed by a peer
  'EADDRINUSE', //   Address already in use
  'EPIPE', //        Broken pipe
  'ETIMEDOUT', //    Operation timed out
  'ENOTFOUND', //    DNS lookup failed
  'EHOSTUNREACH', // No route to host
  'ENETUNREACH', //  Network is unreachable
  'BridgeRequestTimeout',
];

/*
 * The error code returned by the tunneling service.
 * TODO: replace with a constant from the tunneling client.
 */
const TUNNEL_ERROR_CODE = 'TUNNEL_ERROR';

/**
 * A wrapper around the BridgeError that is thrown by the ExecuteBridgeRequest usecase.
 */
class BridgeRequestError extends HttpException {
  constructor(private bridgeError: BridgeError) {
    super(
      {
        message: bridgeError.message,
        code: bridgeError.code,
        data: bridgeError.data,
      },
      bridgeError.statusCode,
      {
        cause: bridgeError.cause,
      }
    );
  }
}

@Injectable()
export class ExecuteFrameworkRequest {
  // Map for error type handlers
  private readonly errorTypeHandlers = new Map<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (
      ...args: any[]
    ) => RequestError,
    {
      errorDef: { code: string; message: (url: string) => string };
      statusCode: number;
      logMessage: (url: string) => string;
      shouldLog: boolean;
    }
  >([
    [
      TimeoutError,
      {
        errorDef: BRIDGE_EXECUTION_ERROR.BRIDGE_REQUEST_TIMEOUT,
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        logMessage: (url) => `Bridge request timeout for \`${url}\``,
        shouldLog: true, // System error
      },
    ],
    [
      UnsupportedProtocolError,
      {
        errorDef: BRIDGE_EXECUTION_ERROR.UNSUPPORTED_PROTOCOL,
        statusCode: HttpStatus.BAD_REQUEST,
        logMessage: (url) => `Unsupported protocol for \`${url}\``,
        shouldLog: false, // Customer config issue
      },
    ],
    [
      ReadError,
      {
        errorDef: BRIDGE_EXECUTION_ERROR.RESPONSE_READ_ERROR,
        statusCode: HttpStatus.BAD_REQUEST,
        logMessage: (url) => `Response body could not be read for \`${url}\``,
        shouldLog: true, // System error
      },
    ],
    [
      UploadError,
      {
        errorDef: BRIDGE_EXECUTION_ERROR.REQUEST_UPLOAD_ERROR,
        statusCode: HttpStatus.BAD_REQUEST,
        logMessage: (url) => `Error uploading request body for \`${url}\``,
        shouldLog: true, // System error
      },
    ],
    [
      CacheError,
      {
        errorDef: BRIDGE_EXECUTION_ERROR.REQUEST_CACHE_ERROR,
        statusCode: HttpStatus.BAD_REQUEST,
        logMessage: (url) => `Error caching request for \`${url}\``,
        shouldLog: true, // System error
      },
    ],
    [
      MaxRedirectsError,
      {
        errorDef: BRIDGE_EXECUTION_ERROR.MAXIMUM_REDIRECTS_EXCEEDED,
        statusCode: HttpStatus.BAD_REQUEST,
        logMessage: (url) => `Maximum redirects exceeded for \`${url}\``,
        shouldLog: false, // Customer config issue
      },
    ],
    [
      ParseError,
      {
        errorDef: BRIDGE_EXECUTION_ERROR.RESPONSE_PARSE_ERROR,
        statusCode: HttpStatus.BAD_GATEWAY,
        logMessage: (url) => `Bridge URL response code is 2xx, but parsing body fails. \`${url}\``,
        shouldLog: true, // System error
      },
    ],
  ]);

  constructor(
    private environmentRepository: EnvironmentRepository,
    private getDecryptedSecretKey: GetDecryptedSecretKey,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute<T extends PostActionEnum | GetActionEnum>(
    command: ExecuteBridgeRequestCommand
  ): Promise<ExecuteBridgeRequestDto<T>> {
    const environment = await this.environmentRepository.findOne({
      _id: command.environmentId,
    });

    if (!environment) {
      throw new NotFoundException(`Environment ${command.environmentId} not found`);
    }

    const bridgeUrl = this.getBridgeUrl(
      environment.bridge?.url || environment.echo?.url,
      command.environmentId,
      command.workflowOrigin,
      command.statelessBridgeUrl,
      command.action
    );

    this.logger.debug(
      `Resolved bridge URL: ${bridgeUrl} for environment ${command.environmentId} and origin ${command.workflowOrigin}`
    );

    const retriesLimit = command.retriesLimit || DEFAULT_RETRIES_LIMIT;
    const bridgeActionUrl = new URL(bridgeUrl);
    bridgeActionUrl.searchParams.set(HttpQueryKeysEnum.ACTION, command.action);

    if (environment.type) {
      bridgeActionUrl.searchParams.set('environmentType', environment.type);
    }

    Object.entries(command.searchParams || {}).forEach(([key, value]) => {
      bridgeActionUrl.searchParams.set(key, value);
    });

    const url = bridgeActionUrl.toString();
    const timeOut = bridgeUrl?.includes(process.env.API_INTERNAL_ORIGIN) ? 60_000 : DEFAULT_TIMEOUT;
    const options: OptionsOfTextResponseBody = {
      timeout: timeOut,
      json: command.event,
      retry: {
        limit: retriesLimit,
        methods: ['GET', 'POST'],
        statusCodes: RETRYABLE_HTTP_CODES,
        errorCodes: RETRYABLE_ERROR_CODES,
        calculateDelay: ({ attemptCount, error }) => {
          if (attemptCount > retriesLimit) {
            this.logger.info(`Exceeded retry limit of ${retriesLimit}. Stopping retries.`);

            return 0;
          }

          // Check if the error status code is in our retryable codes
          if (error?.response?.statusCode && RETRYABLE_HTTP_CODES.includes(error.response.statusCode)) {
            const delay = 2 ** attemptCount * RETRY_BASE_INTERVAL_IN_MS;
            this.logger.info(`Retryable status code ${error.response.statusCode} detected. Retrying in ${delay}ms`);

            return delay;
          }

          // Check if the error code is in our retryable error codes
          if (error?.code && RETRYABLE_ERROR_CODES.includes(error.code)) {
            const delay = 2 ** attemptCount * RETRY_BASE_INTERVAL_IN_MS;
            this.logger.info(`Retryable error code ${error.code} detected. Retrying in ${delay}ms`);

            return delay;
          }

          let errorDetails = {};
          if (error?.response?.body) {
            try {
              errorDetails = JSON.parse(error.response.body as string);
            } catch {
              errorDetails = { rawBody: error.response.body };
            }
          }

          this.logger.info(
            {
              err: error,
              statusCode: error?.response?.statusCode,
              bridgeErrorDetails: errorDetails,
              errorCode: error?.code,
            },
            'Error is not retryable. Stopping retry attempts.'
          );

          return 0; // Don't retry for other errors
        },
      },
      https: {
        /*
         * Reject self-signed and invalid certificates in Production environments but allow them in Development
         * as it's common for developers to use self-signed certificates in local environments.
         */
        rejectUnauthorized: environment.name.toLowerCase() === 'production',
      },
    };

    const request = [PostActionEnum.EXECUTE, PostActionEnum.PREVIEW].includes(command.action as PostActionEnum)
      ? got.post
      : got.get;

    const headers = await this.buildRequestHeaders(command);

    this.logger.debug(`Making bridge request to \`${url}\``);
    try {
      return await request(url, {
        ...options,
        headers,
      }).json();
    } catch (error) {
      await this.handleResponseError(error, bridgeUrl, command.processError);
    }
  }

  @Instrument()
  private async buildRequestHeaders(command: ExecuteBridgeRequestCommand) {
    const novuSignatureHeader = await this.buildRequestSignature(command);

    return {
      [HttpRequestHeaderKeysEnum.BYPASS_TUNNEL_REMINDER]: 'true',
      [HttpRequestHeaderKeysEnum.CONTENT_TYPE]: 'application/json',
      [HttpHeaderKeysEnum.NOVU_SIGNATURE]: novuSignatureHeader,
    };
  }

  @Instrument()
  private async buildRequestSignature(command: ExecuteBridgeRequestCommand) {
    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: command.environmentId,
      })
    );

    const timestamp = Date.now();
    const novuSignatureHeader = `t=${timestamp},v1=${this.createHmacBySecretKey(
      secretKey,
      timestamp,
      command.event || {}
    )}`;

    return novuSignatureHeader;
  }

  @Instrument()
  private createHmacBySecretKey(secretKey: string, timestamp: number, payload: unknown) {
    const publicKey = `${timestamp}.${JSON.stringify(payload)}`;

    return createHmac('sha256', secretKey).update(publicKey).digest('hex');
  }

  /**
   * Returns the bridge URL based on the workflow origin and statelessBridgeUrl.
   *
   * - Novu Cloud workflows go to the Novu API Bridge
   * - External workflows go to the Client Bridge
   *
   * @param environmentBridgeUrl - The URL of the bridge app.
   * @param environmentId - The ID of the environment.
   * @param workflowOrigin - The origin of the workflow.
   * @param statelessBridgeUrl - The URL of the stateless bridge app.
   * @returns The correct bridge URL.
   */
  @Instrument()
  private getBridgeUrl(
    environmentBridgeUrl: string,
    environmentId: string,
    workflowOrigin: ResourceOriginEnum,
    statelessBridgeUrl?: string,
    action?: PostActionEnum | GetActionEnum
  ): string {
    if (statelessBridgeUrl) {
      return statelessBridgeUrl;
    }

    switch (workflowOrigin) {
      case ResourceOriginEnum.NOVU_CLOUD: {
        const apiUrl = this.getApiUrl(action);

        return `${apiUrl}/v1/environments/${environmentId}/bridge`;
      }
      case ResourceOriginEnum.EXTERNAL: {
        if (!environmentBridgeUrl) {
          throw new BadRequestException({
            code: BRIDGE_EXECUTION_ERROR.INVALID_BRIDGE_URL.code,
            message: BRIDGE_EXECUTION_ERROR.INVALID_BRIDGE_URL.message(environmentBridgeUrl),
          });
        }

        return environmentBridgeUrl;
      }
      default:
        throw new Error(`Unsupported workflow origin: ${workflowOrigin}`);
    }
  }

  private getApiUrl(action: PostActionEnum | GetActionEnum): string {
    const baseUrl =
      action === PostActionEnum.PREVIEW
        ? `http://localhost:${process.env.PORT}`
        : process.env.API_INTERNAL_ORIGIN || process.env.API_ROOT_URL;

    if (!baseUrl) {
      throw new Error('API URL is not properly configured');
    }

    // Ensure the URL doesn't end with a slash
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // Add GLOBAL_CONTEXT_PATH and API_CONTEXT_PATH if they exist
    const contextPath = [
      process.env.GLOBAL_CONTEXT_PATH,
      action === PostActionEnum.PREVIEW ? process.env.API_CONTEXT_PATH : undefined,
    ]
      .filter(Boolean)
      .join('/');

    // Only append context path if it's not empty
    return contextPath ? `${cleanBaseUrl}/${contextPath}` : cleanBaseUrl;
  }

  private shouldLogError(statusCode?: number): boolean {
    // Don't log customer errors (4xx) - they're config issues, not system errors
    // Log system errors (5xx) and errors without status codes (timeouts, network, etc.)
    return !statusCode || statusCode >= 500;
  }

  private parseErrorBody(error: RequestError): Record<string, unknown> {
    try {
      return JSON.parse(error.response.body as string);
    } catch {
      return {};
    }
  }

  private findErrorTypeConfig(error: RequestError) {
    for (const [ErrorClass, config] of this.errorTypeHandlers) {
      if (error instanceof ErrorClass) {
        return config;
      }
    }

    return null;
  }

  private handleHttpStatusError(statusCode: number, url: string): Pick<BridgeError, 'code' | 'statusCode' | 'message'> {
    switch (statusCode) {
      case 401:
        return {
          message: BRIDGE_EXECUTION_ERROR.BRIDGE_AUTHENTICATION_FAILED.message(url),
          code: BRIDGE_EXECUTION_ERROR.BRIDGE_AUTHENTICATION_FAILED.code,
          statusCode: HttpStatus.UNAUTHORIZED,
        };
      case 404:
        return {
          message: BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_UNAVAILABLE.message(url),
          code: BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_UNAVAILABLE.code,
          statusCode: HttpStatus.NOT_FOUND,
        };
      case 405:
        return {
          message: BRIDGE_EXECUTION_ERROR.BRIDGE_METHOD_NOT_CONFIGURED.message(url),
          code: BRIDGE_EXECUTION_ERROR.BRIDGE_METHOD_NOT_CONFIGURED.code,
          statusCode: HttpStatus.BAD_REQUEST,
        };
      case 413:
        return {
          message: BRIDGE_EXECUTION_ERROR.PAYLOAD_TOO_LARGE.message(url),
          code: BRIDGE_EXECUTION_ERROR.PAYLOAD_TOO_LARGE.code,
          statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        };
      case 502:
        return {
          message: BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_NOT_FOUND.message(url),
          code: BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_NOT_FOUND.code,
          statusCode: HttpStatus.NOT_FOUND,
        };
      default:
        return {
          message: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_REQUEST_ERROR.message(url),
          code: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_REQUEST_ERROR.code,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        };
    }
  }

  @Instrument()
  private async handleResponseError(
    error: unknown,
    url: string,
    processError: ExecuteBridgeRequestCommand['processError']
  ): Promise<never> {
    let bridgeErrorData: Pick<BridgeError, 'data' | 'code' | 'statusCode' | 'message' | 'cause'>;

    if (!(error instanceof RequestError)) {
      this.logger.error({ err: error }, `Unknown bridge non-request error calling \`${url}\``);
      bridgeErrorData = {
        message: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_NON_REQUEST_ERROR.message(url),
        code: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_NON_REQUEST_ERROR.code,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    } else {
      const body = this.parseErrorBody(error);

      // Handle known Framework errors (propagate as-is, no logging)
      if (error instanceof HTTPError && isFrameworkError(body)) {
        bridgeErrorData = {
          data: body.data,
          code: body.code,
          message: body.message,
          statusCode: error.response.statusCode,
        };
      }
      // Try error type map lookup
      else {
        const errorTypeConfig = this.findErrorTypeConfig(error);
        if (errorTypeConfig) {
          if (errorTypeConfig.shouldLog) {
            this.logger.error(errorTypeConfig.logMessage(url));
          }
          bridgeErrorData = {
            code: errorTypeConfig.errorDef.code,
            message: errorTypeConfig.errorDef.message(url),
            statusCode: errorTypeConfig.statusCode,
          };
        }
        // Handle tunnel errors
        else if (body.code === TUNNEL_ERROR_CODE) {
          // Don't log - 404 is customer config issue (wrong URL or tunnel not set up)
          bridgeErrorData = {
            message: BRIDGE_EXECUTION_ERROR.TUNNEL_NOT_FOUND.message(url),
            code: BRIDGE_EXECUTION_ERROR.TUNNEL_NOT_FOUND.code,
            statusCode: HttpStatus.NOT_FOUND,
          };
        }
        // Handle self-signed certificate error
        else if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
          // Don't log - customer config issue
          bridgeErrorData = {
            message: BRIDGE_EXECUTION_ERROR.SELF_SIGNED_CERTIFICATE.message(url),
            code: BRIDGE_EXECUTION_ERROR.SELF_SIGNED_CERTIFICATE.code,
            statusCode: HttpStatus.BAD_REQUEST,
          };
        }
        // Handle retryable network errors
        else if (RETRYABLE_ERROR_CODES.includes(error.code)) {
          // Don't log - could be customer network issue, error propagates to customer
          bridgeErrorData = {
            message: BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_UNAVAILABLE.message(url),
            code: error.code,
            statusCode: HttpStatus.BAD_REQUEST,
          };
        }
        // Handle HTTP status codes
        else if (error.response?.statusCode) {
          bridgeErrorData = this.handleHttpStatusError(error.response.statusCode, url);
          if (this.shouldLogError(error.response.statusCode)) {
            const logMessage =
              error.response.statusCode === 502
                ? `Local Bridge endpoint not found for \`${url}\``
                : `Unknown bridge request error calling \`${url}\`: \`${JSON.stringify(body)}\``;
            this.logger.error({ err: error }, logMessage);
          }
        }
        // Unknown error
        else {
          this.logger.error(
            { err: error },
            `Unknown bridge request error calling \`${url}\`: \`${JSON.stringify(body)}\``
          );
          bridgeErrorData = {
            message: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_REQUEST_ERROR.message(url),
            code: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_REQUEST_ERROR.code,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          };
        }
      }
    }

    const fullBridgeError: BridgeError = {
      ...bridgeErrorData,
      cause: error,
      url,
    };

    if (processError) {
      await processError(fullBridgeError);
    }

    throw new BridgeRequestError(fullBridgeError);
  }
}
