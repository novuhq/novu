import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import {
  GetActionEnum,
  HttpHeaderKeysEnum,
  HttpQueryKeysEnum,
  isFrameworkError,
  PostActionEnum,
} from '@novu/framework/internal';
import { ResourceOriginEnum } from '@novu/shared';
import { HttpRequestHeaderKeysEnum } from '../../http';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { PinoLogger } from '../../logging';
import {
  DEFAULT_RETRIES_LIMIT,
  DEFAULT_TIMEOUT,
  HttpClientError,
  HttpClientErrorType,
  HttpClientService,
  RETRYABLE_ERROR_CODES,
} from '../../services/http-client';
import { BRIDGE_EXECUTION_ERROR, buildNovuSignatureHeader } from '../../utils';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '../get-decrypted-secret-key';
import { BridgeError, ExecuteBridgeRequestCommand, ExecuteBridgeRequestDto } from './execute-bridge-request.command';

const TUNNEL_ERROR_CODE = 'TUNNEL_ERROR';

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
export class ExecuteFrameworkRequest {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private getDecryptedSecretKey: GetDecryptedSecretKey,
    private logger: PinoLogger,
    private httpClient: HttpClientService
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
    let bridgeActionUrl: URL;
    try {
      bridgeActionUrl = new URL(bridgeUrl);
    } catch {
      throw new BadRequestException({
        code: BRIDGE_EXECUTION_ERROR.INVALID_BRIDGE_URL.code,
        message: BRIDGE_EXECUTION_ERROR.INVALID_BRIDGE_URL.message(bridgeUrl),
      });
    }
    bridgeActionUrl.searchParams.set(HttpQueryKeysEnum.ACTION, command.action);

    if (environment.type) {
      bridgeActionUrl.searchParams.set('environmentType', environment.type);
    }

    for (const [key, value] of Object.entries(command.searchParams || {})) {
      bridgeActionUrl.searchParams.set(key, value);
    }

    const url = bridgeActionUrl.toString();
    const timeout = bridgeUrl?.includes(process.env.API_INTERNAL_ORIGIN) ? 60_000 : DEFAULT_TIMEOUT;
    const method = [PostActionEnum.EXECUTE, PostActionEnum.PREVIEW].includes(command.action as PostActionEnum)
      ? 'POST'
      : 'GET';

    const headers = await this.buildRequestHeaders(command);

    this.logger.debug(`Making bridge request to \`${url}\``);

    try {
      const response = await this.httpClient.request<ExecuteBridgeRequestDto<T>>({
        url,
        method,
        headers,
        body: command.event,
        timeout,
        retry: {
          limit: retriesLimit,
        },
        rejectUnauthorized: environment.name.toLowerCase() === 'production',
        onRetry: ({ statusCode, errorCode, delay }) => {
          if (statusCode) {
            this.logger.info(`Retryable status code ${statusCode} detected. Retrying in ${delay}ms`);
          } else if (errorCode) {
            this.logger.info(`Retryable error code ${errorCode} detected. Retrying in ${delay}ms`);
          }
        },
      });

      return response.body;
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

    return buildNovuSignatureHeader(secretKey, command.event || {});
  }

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

    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const contextPath = [
      process.env.GLOBAL_CONTEXT_PATH,
      action === PostActionEnum.PREVIEW ? process.env.API_CONTEXT_PATH : undefined,
    ]
      .filter(Boolean)
      .join('/');

    return contextPath ? `${cleanBaseUrl}/${contextPath}` : cleanBaseUrl;
  }

  private shouldLogError(statusCode?: number): boolean {
    return !statusCode || statusCode >= 500;
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

    if (!(error instanceof HttpClientError)) {
      this.logger.error({ err: error }, `Unknown bridge non-request error calling \`${url}\``);
      bridgeErrorData = {
        message: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_NON_REQUEST_ERROR.message(url),
        code: BRIDGE_EXECUTION_ERROR.UNKNOWN_BRIDGE_NON_REQUEST_ERROR.code,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    } else {
      const body = error.responseBody as Record<string, unknown> | undefined;

      if (error.type === HttpClientErrorType.HTTP_ERROR && isFrameworkError(body)) {
        bridgeErrorData = {
          data: body.data,
          code: body.code,
          message: body.message,
          statusCode: error.statusCode,
        };
      } else {
        switch (error.type) {
          case HttpClientErrorType.TIMEOUT:
            this.logger.error(`Bridge request timeout for \`${url}\``);
            bridgeErrorData = {
              code: BRIDGE_EXECUTION_ERROR.BRIDGE_REQUEST_TIMEOUT.code,
              message: BRIDGE_EXECUTION_ERROR.BRIDGE_REQUEST_TIMEOUT.message(url),
              statusCode: HttpStatus.REQUEST_TIMEOUT,
            };
            break;

          case HttpClientErrorType.UNSUPPORTED_PROTOCOL:
            bridgeErrorData = {
              code: BRIDGE_EXECUTION_ERROR.UNSUPPORTED_PROTOCOL.code,
              message: BRIDGE_EXECUTION_ERROR.UNSUPPORTED_PROTOCOL.message(url),
              statusCode: HttpStatus.BAD_REQUEST,
            };
            break;

          case HttpClientErrorType.READ_ERROR:
            this.logger.error(`Response body could not be read for \`${url}\``);
            bridgeErrorData = {
              code: BRIDGE_EXECUTION_ERROR.RESPONSE_READ_ERROR.code,
              message: BRIDGE_EXECUTION_ERROR.RESPONSE_READ_ERROR.message(url),
              statusCode: HttpStatus.BAD_REQUEST,
            };
            break;

          case HttpClientErrorType.UPLOAD_ERROR:
            this.logger.error(`Error uploading request body for \`${url}\``);
            bridgeErrorData = {
              code: BRIDGE_EXECUTION_ERROR.REQUEST_UPLOAD_ERROR.code,
              message: BRIDGE_EXECUTION_ERROR.REQUEST_UPLOAD_ERROR.message(url),
              statusCode: HttpStatus.BAD_REQUEST,
            };
            break;

          case HttpClientErrorType.CACHE_ERROR:
            this.logger.error(`Error caching request for \`${url}\``);
            bridgeErrorData = {
              code: BRIDGE_EXECUTION_ERROR.REQUEST_CACHE_ERROR.code,
              message: BRIDGE_EXECUTION_ERROR.REQUEST_CACHE_ERROR.message(url),
              statusCode: HttpStatus.BAD_REQUEST,
            };
            break;

          case HttpClientErrorType.MAX_REDIRECTS:
            bridgeErrorData = {
              code: BRIDGE_EXECUTION_ERROR.MAXIMUM_REDIRECTS_EXCEEDED.code,
              message: BRIDGE_EXECUTION_ERROR.MAXIMUM_REDIRECTS_EXCEEDED.message(url),
              statusCode: HttpStatus.BAD_REQUEST,
            };
            break;

          case HttpClientErrorType.PARSE_ERROR:
            this.logger.error(`Bridge URL response code is 2xx, but parsing body fails. \`${url}\``);
            bridgeErrorData = {
              code: BRIDGE_EXECUTION_ERROR.RESPONSE_PARSE_ERROR.code,
              message: BRIDGE_EXECUTION_ERROR.RESPONSE_PARSE_ERROR.message(url),
              statusCode: HttpStatus.BAD_GATEWAY,
            };
            break;

          case HttpClientErrorType.CERTIFICATE_ERROR:
            bridgeErrorData = {
              code: BRIDGE_EXECUTION_ERROR.SELF_SIGNED_CERTIFICATE.code,
              message: BRIDGE_EXECUTION_ERROR.SELF_SIGNED_CERTIFICATE.message(url),
              statusCode: HttpStatus.BAD_REQUEST,
            };
            break;

          case HttpClientErrorType.NETWORK_ERROR:
            if (error.networkCode && RETRYABLE_ERROR_CODES.includes(error.networkCode)) {
              bridgeErrorData = {
                message: BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_UNAVAILABLE.message(url),
                code: error.networkCode,
                statusCode: HttpStatus.BAD_REQUEST,
              };
            } else if (body?.code === TUNNEL_ERROR_CODE) {
              bridgeErrorData = {
                message: BRIDGE_EXECUTION_ERROR.TUNNEL_NOT_FOUND.message(url),
                code: BRIDGE_EXECUTION_ERROR.TUNNEL_NOT_FOUND.code,
                statusCode: HttpStatus.NOT_FOUND,
              };
            } else {
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
            break;

          case HttpClientErrorType.HTTP_ERROR: {
            if (body?.code === TUNNEL_ERROR_CODE) {
              bridgeErrorData = {
                message: BRIDGE_EXECUTION_ERROR.TUNNEL_NOT_FOUND.message(url),
                code: BRIDGE_EXECUTION_ERROR.TUNNEL_NOT_FOUND.code,
                statusCode: HttpStatus.NOT_FOUND,
              };
            } else if (error.statusCode) {
              bridgeErrorData = this.handleHttpStatusError(error.statusCode, url);
              if (this.shouldLogError(error.statusCode)) {
                const logMessage =
                  error.statusCode === 502
                    ? `Local Bridge endpoint not found for \`${url}\``
                    : `Unknown bridge request error calling \`${url}\`: \`${JSON.stringify(body)}\``;
                this.logger.error({ err: error }, logMessage);
              }
            } else {
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
            break;
          }

          default:
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
