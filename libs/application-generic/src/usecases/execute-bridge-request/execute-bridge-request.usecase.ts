import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { createHmac } from 'node:crypto';
import {
  GetActionEnum,
  HttpHeaderKeysEnum,
  HttpQueryKeysEnum,
  isFrameworkError,
  PostActionEnum,
} from '@novu/framework/internal';
import { EnvironmentRepository } from '@novu/dal';
import { WorkflowOriginEnum } from '@novu/shared';
import { BridgeError, ExecuteBridgeRequestCommand, ExecuteBridgeRequestDto } from './execute-bridge-request.command';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '../get-decrypted-secret-key';
import { BRIDGE_EXECUTION_ERROR } from '../../utils';
import { HttpRequestHeaderKeysEnum } from '../../http';
import { Instrument, InstrumentUsecase } from '../../instrumentation';

const isTestEnv = process.env.NODE_ENV === 'test';

export const DEFAULT_TIMEOUT = 5_000; // 5 seconds
export const DEFAULT_RETRIES_LIMIT = 3;
export const RETRYABLE_HTTP_CODES: number[] = isTestEnv
  ? []
  : [
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
export const RETRYABLE_ERROR_CODES: string[] = isTestEnv
  ? []
  : [
      'EAI_AGAIN', //    DNS resolution failed, retry
      'ECONNREFUSED', // Connection refused by the server
      'ECONNRESET', //   Connection was forcibly closed by a peer
      'EADDRINUSE', //   Address already in use
      'EPIPE', //        Broken pipe
      'ETIMEDOUT', //    Operation timed out
      'ENOTFOUND', //    DNS lookup failed
      'EHOSTUNREACH', // No route to host
      'ENETUNREACH', //  Network is unreachable
    ];

const LOG_CONTEXT = 'ExecuteBridgeRequest';

/*
 * The error code returned by the tunneling service.
 * TODO: replace with a constant from the tunneling client.
 */
const TUNNEL_ERROR_CODE = 'TUNNEL_ERROR';

type TunnelResponseError = {
  code: string;
  message: string;
};

/**
 * A wrapper around the BridgeError that is thrown by the ExecuteBridgeRequest usecase.
 */
class BridgeRequestError extends HttpException {
  constructor(bridgeError: BridgeError) {
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
export class ExecuteBridgeRequest {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private getDecryptedSecretKey: GetDecryptedSecretKey
  ) {}

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

    Logger.log(
      `Resolved bridge URL: ${bridgeUrl} for environment ${command.environmentId} and origin ${command.workflowOrigin}`,
      LOG_CONTEXT
    );

    const retriesLimit = command.retriesLimit || DEFAULT_RETRIES_LIMIT;
    const bridgeActionUrl = new URL(bridgeUrl);
    bridgeActionUrl.searchParams.set(HttpQueryKeysEnum.ACTION, command.action);
    Object.entries(command.searchParams || {}).forEach(([key, value]) => {
      bridgeActionUrl.searchParams.set(key, value);
    });

    const url = bridgeActionUrl.toString();
    const options: OptionsOfTextResponseBody = {
      timeout: DEFAULT_TIMEOUT,
      json: command.event,
      retry: {
        limit: retriesLimit,
        methods: ['GET', 'POST'],
        statusCodes: RETRYABLE_HTTP_CODES,
        errorCodes: RETRYABLE_ERROR_CODES,
        calculateDelay: ({ attemptCount, error }) => {
          if (attemptCount > retriesLimit) {
            Logger.log(`Exceeded retry limit of ${retriesLimit}. Stopping retries.`, LOG_CONTEXT);

            return 0;
          }

          // Check if the error status code is in our retryable codes
          if (error?.response?.statusCode && RETRYABLE_HTTP_CODES.includes(error.response.statusCode)) {
            const delay = 2 ** attemptCount * 1000;
            Logger.log(
              `Retryable status code ${error.response.statusCode} detected. Retrying in ${delay}ms`,
              LOG_CONTEXT
            );

            return delay;
          }

          // Check if the error code is in our retryable error codes
          if (error?.code && RETRYABLE_ERROR_CODES.includes(error.code)) {
            const delay = 2 ** attemptCount * 1000;
            Logger.log(`Retryable error code ${error.code} detected. Retrying in ${delay}ms`, LOG_CONTEXT);

            return delay;
          }

          Logger.log('Error is not retryable. Stopping retry attempts.', LOG_CONTEXT);

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

    Logger.log(`Making bridge request to \`${url}\``, LOG_CONTEXT);
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
    workflowOrigin: WorkflowOriginEnum,
    statelessBridgeUrl?: string,
    action?: PostActionEnum | GetActionEnum
  ): string {
    if (statelessBridgeUrl) {
      return statelessBridgeUrl;
    }

    switch (workflowOrigin) {
      case WorkflowOriginEnum.NOVU_CLOUD: {
        const apiUrl = this.getApiUrl(action);

        return `${apiUrl}/v1/environments/${environmentId}/bridge`;
      }
      case WorkflowOriginEnum.EXTERNAL: {
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
    if (action === PostActionEnum.PREVIEW) {
      return `http://localhost:${process.env.PORT}`;
    }

    const apiUrl = process.env.API_INTERNAL_ORIGIN || process.env.API_ROOT_URL;

    if (!apiUrl) {
      throw new Error('API_ROOT_URL environment variable is not set');
    }

    return apiUrl;
  }

  @Instrument()
  private async handleResponseError(
    error: unknown,
    url: string,
    processError: ExecuteBridgeRequestCommand['processError']
  ) {
    let bridgeErrorData: Pick<BridgeError, 'data' | 'code' | 'statusCode' | 'message' | 'cause'>;
    if (error instanceof RequestError) {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(error.response.body as string);
      } catch (e) {
        // If the body is not valid JSON, we'll just use an empty object.
        body = {};
      }

      if (error instanceof HTTPError && isFrameworkError(body)) {
        // Handle known Framework errors. Propagate the error code and message.
        bridgeErrorData = {
          data: body.data,
          code: body.code,
          message: body.message,
          statusCode: error.response.statusCode,
        };
      } else if (error instanceof TimeoutError) {
        Logger.error(`Bridge request timeout for \`${url}\``, LOG_CONTEXT);
        bridgeErrorData = {
          code: BRIDGE_EXECUTION_ERROR.BRIDGE_REQUEST_TIMEOUT.code,
          message: BRIDGE_EXECUTION_ERROR.BRIDGE_REQUEST_TIMEOUT.message(url),
          statusCode: HttpStatus.REQUEST_TIMEOUT,
        };
      } else if (error instanceof UnsupportedProtocolError) {
        Logger.error(`Unsupported protocol for \`${url}\``, LOG_CONTEXT);
        bridgeErrorData = {
          code: BRIDGE_EXECUTION_ERROR.UNSUPPORTED_PROTOCOL.code,
          message: BRIDGE_EXECUTION_ERROR.UNSUPPORTED_PROTOCOL.message(url),
          statusCode: HttpStatus.BAD_REQUEST,
        };
      } else if (error instanceof ReadError) {
        Logger.error(`Response body could not be read for \`${url}\``, LOG_CONTEXT);
        bridgeErrorData = {
          code: BRIDGE_EXECUTION_ERROR.RESPONSE_READ_ERROR.code,
          message: BRIDGE_EXECUTION_ERROR.RESPONSE_READ_ERROR.message(url),
          statusCode: HttpStatus.BAD_REQUEST,
        };
      } else if (error instanceof UploadError) {
        Logger.error(`Error uploading request body for \`${url}\``, LOG_CONTEXT);
        bridgeErrorData = {
          code: BRIDGE_EXECUTION_ERROR.REQUEST_UPLOAD_ERROR.code,
          message: BRIDGE_EXECUTION_ERROR.REQUEST_UPLOAD_ERROR.message(url),
          statusCode: HttpStatus.BAD_REQUEST,
        };
      } else if (error instanceof CacheError) {
        Logger.error(`Error caching request for \`${url}\``, LOG_CONTEXT);
        bridgeErrorData = {
          code: BRIDGE_EXECUTION_ERROR.REQUEST_CACHE_ERROR.code,
          message: BRIDGE_EXECUTION_ERROR.REQUEST_CACHE_ERROR.message(url),
          statusCode: HttpStatus.BAD_REQUEST,
        };
      } else if (error instanceof MaxRedirectsError) {
        Logger.error(`Maximum redirects exceeded for \`${url}\``, LOG_CONTEXT);
        bridgeErrorData = {
          message: BRIDGE_EXECUTION_ERROR.MAXIMUM_REDIRECTS_EXCEEDED.message(url),
          code: BRIDGE_EXECUTION_ERROR.MAXIMUM_REDIRECTS_EXCEEDED.code,
          statusCode: HttpStatus.BAD_REQUEST,
        };
      } else if (error instanceof ParseError) {
        Logger.error(`Bridge URL response code is 2xx, but parsing body fails. \`${url}\``, LOG_CONTEXT);
        bridgeErrorData = {
          message: BRIDGE_EXECUTION_ERROR.MAXIMUM_REDIRECTS_EXCEEDED.message(url),
          code: BRIDGE_EXECUTION_ERROR.MAXIMUM_REDIRECTS_EXCEEDED.code,
          statusCode: HttpStatus.BAD_REQUEST,
        };
      } else if (body.code === TUNNEL_ERROR_CODE) {
        // Handle known tunnel errors
        const tunnelBody = body as TunnelResponseError;
        Logger.error(
          `Could not establish tunnel connection for \`${url}\`. Error: \`${tunnelBody.message}\``,
          LOG_CONTEXT
        );
        bridgeErrorData = {
          message: BRIDGE_EXECUTION_ERROR.TUNNEL_NOT_FOUND.message(url),
          code: BRIDGE_EXECUTION_ERROR.TUNNEL_NOT_FOUND.code,
          statusCode: HttpStatus.NOT_FOUND,
        };
      } else if (error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
        Logger.error(
          `Bridge URL is uing a self-signed certificate that is not allowed for production environments. \`${url}\``,
          LOG_CONTEXT
        );
        bridgeErrorData = {
          message: BRIDGE_EXECUTION_ERROR.SELF_SIGNED_CERTIFICATE.message(url),
          code: BRIDGE_EXECUTION_ERROR.SELF_SIGNED_CERTIFICATE.code,
          statusCode: HttpStatus.BAD_REQUEST,
        };
      } else if (error.response?.statusCode === 502) {
        /*
         * Tunnel was live, but the Bridge endpoint was down.
         * 502 is thrown by the tunnel service when the Bridge endpoint is not reachable.
         */
        Logger.error(`Local Bridge endpoint not found for \`${url}\``, LOG_CONTEXT);
        bridgeErrorData = {
          message: BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_NOT_FOUND.message(url),
          code: BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_NOT_FOUND.code,
          statusCode: HttpStatus.NOT_FOUND,
        };
      } else if (error.response?.statusCode === 404 || RETRYABLE_ERROR_CODES.includes(error.code)) {
        Logger.error(`Bridge endpoint unavailable for \`${url}\``, LOG_CONTEXT);

        let codeToThrow: string;
        if (RETRYABLE_ERROR_CODES.includes(error.code)) {
          codeToThrow = error.code;
        } else {
          codeToThrow = BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_UNAVAILABLE.code;
        }
        bridgeErrorData = {
          message: BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_UNAVAILABLE.message(url),
          code: codeToThrow,
          statusCode: HttpStatus.BAD_REQUEST,
        };
      } else if (error.response?.statusCode === 405) {
        Logger.error(`Bridge endpoint method not configured for \`${url}\``, LOG_CONTEXT);
        bridgeErrorData = {
          message: BRIDGE_EXECUTION_ERROR.BRIDGE_METHOD_NOT_CONFIGURED.message(url),
          code: BRIDGE_EXECUTION_ERROR.BRIDGE_METHOD_NOT_CONFIGURED.code,
          statusCode: HttpStatus.BAD_REQUEST,
        };
      } else {
        Logger.error(
          `Unknown bridge request error calling \`${url}\`: \`${JSON.stringify(body)}\``,
          error,
          LOG_CONTEXT
        );
        bridgeErrorData = {
          message: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_REQUEST_ERROR.message(url),
          code: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_REQUEST_ERROR.code,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      }
    } else {
      Logger.error(`Unknown bridge non-request error calling \`${url}\``, error, LOG_CONTEXT);
      bridgeErrorData = {
        message: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_NON_REQUEST_ERROR.message(url),
        code: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_NON_REQUEST_ERROR.code,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
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
