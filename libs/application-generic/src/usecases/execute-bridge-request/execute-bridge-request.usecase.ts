import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import got, { OptionsOfTextResponseBody, RequestError } from 'got';
import { createHmac } from 'node:crypto';

import {
  PostActionEnum,
  HttpHeaderKeysEnum,
  HttpQueryKeysEnum,
  GetActionEnum,
  ErrorCodeEnum,
} from '@novu/framework';
import { EnvironmentRepository } from '@novu/dal';
import { HttpRequestHeaderKeysEnum, WorkflowOriginEnum } from '@novu/shared';
import {
  ExecuteBridgeRequestCommand,
  ExecuteBridgeRequestDto,
} from './execute-bridge-request.command';
import {
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
} from '../get-decrypted-secret-key';
import { BRIDGE_EXECUTION_ERROR } from '../../utils';

export const DEFAULT_TIMEOUT = 15_000; // 15 seconds
export const DEFAULT_RETRIES_LIMIT = 3;
export const RETRYABLE_HTTP_CODES: number[] = [
  408, 413, 429, 500, 502, 503, 504, 521, 522, 524,
];
const RETRYABLE_ERROR_CODES: string[] = [
  'ETIMEDOUT',
  'ECONNRESET',
  'EADDRINUSE',
  'ECONNREFUSED',
  'EPIPE',
  'ENOTFOUND',
  'ENETUNREACH',
  'EAI_AGAIN',
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

@Injectable()
export class ExecuteBridgeRequest {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private getDecryptedSecretKey: GetDecryptedSecretKey,
  ) {}

  async execute<T extends PostActionEnum | GetActionEnum>(
    command: ExecuteBridgeRequestCommand,
  ): Promise<ExecuteBridgeRequestDto<T>> {
    const environment = await this.environmentRepository.findOne({
      _id: command.environmentId,
    });

    if (!environment) {
      throw new NotFoundException(
        `Environment ${command.environmentId} not found`,
      );
    }

    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({
        environmentId: command.environmentId,
      }),
    );
    const bridgeUrl = this.getBridgeUrl(
      environment.bridge?.url || environment.echo?.url,
      command.environmentId,
      command.workflowOrigin,
      command.statelessBridgeUrl,
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
        calculateDelay: ({
          attemptCount,
        }: {
          attemptCount: number;
        }): number => {
          if (attemptCount === retriesLimit) {
            return 0;
          }

          return 2 ** attemptCount * 1000;
        },
        statusCodes: RETRYABLE_HTTP_CODES,
        errorCodes: RETRYABLE_ERROR_CODES,
      },
      hooks: {
        afterResponse:
          command.afterResponse !== undefined ? [command.afterResponse] : [],
      },
    };

    const timestamp = Date.now();
    const novuSignatureHeader = `t=${timestamp},v1=${this.createHmacBySecretKey(
      secretKey,
      timestamp,
      command.event || {},
    )}`;

    const request = [PostActionEnum.EXECUTE, PostActionEnum.PREVIEW].includes(
      command.action as PostActionEnum,
    )
      ? got.post
      : got.get;

    const headers = {
      [HttpRequestHeaderKeysEnum.BYPASS_TUNNEL_REMINDER]: 'true',
      [HttpRequestHeaderKeysEnum.CONTENT_TYPE]: 'application/json',
      [HttpHeaderKeysEnum.NOVU_SIGNATURE_DEPRECATED]: novuSignatureHeader,
      [HttpHeaderKeysEnum.NOVU_SIGNATURE]: novuSignatureHeader,
    };

    Logger.log(`Making bridge request to \`${url}\``, LOG_CONTEXT);
    try {
      return await request(url, {
        ...options,
        headers,
      }).json();
    } catch (error) {
      if (error instanceof RequestError) {
        let body: Record<string, unknown>;
        try {
          body = JSON.parse(error.response.body as string);
        } catch (e) {
          // If the body is not valid JSON, we'll just use an empty object.
          body = {};
        }

        if (Object.values(ErrorCodeEnum).includes(body.code as ErrorCodeEnum)) {
          // Handle known Bridge errors. Propagate the error code and message.
          throw new HttpException(body, error.response.statusCode);
        } else if (body.code === TUNNEL_ERROR_CODE) {
          // Handle known tunnel errors
          const tunnelBody = body as TunnelResponseError;
          Logger.error(
            `Could not establish tunnel connection for \`${url}\`. Error: \`${tunnelBody.message}\``,
            LOG_CONTEXT,
          );
          throw new NotFoundException(BRIDGE_EXECUTION_ERROR.TUNNEL_NOT_FOUND);
        } else if (error.response?.statusCode === 502) {
          /*
           * Tunnel was live, but the Bridge endpoint was down.
           * 502 is thrown by the tunnel service when the Bridge endpoint is not reachable.
           */
          Logger.error(
            `Bridge endpoint unavailable for \`${url}\``,
            LOG_CONTEXT,
          );
          throw new BadRequestException(
            BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_UNAVAILABLE,
          );
        } else if (error.response?.statusCode === 404) {
          // Bridge endpoint wasn't found.
          Logger.error(`Bridge endpoint not found for \`${url}\``, LOG_CONTEXT);
          throw new NotFoundException(
            BRIDGE_EXECUTION_ERROR.BRIDGE_ENDPOINT_NOT_FOUND,
          );
        } else if (error.response?.statusCode === 405) {
          // The Bridge endpoint didn't expose the required methods.
          Logger.error(
            `Bridge endpoint method not configured for \`${url}\``,
            LOG_CONTEXT,
          );
          throw new BadRequestException(
            BRIDGE_EXECUTION_ERROR.BRIDGE_METHOD_NOT_CONFIGURED,
          );
        } else {
          // Unknown errors when calling the Bridge endpoint.
          Logger.error(
            `Unknown bridge request error calling \`${url}\`: \`${JSON.stringify(
              body,
            )}\``,
            LOG_CONTEXT,
          );
          throw error;
        }
      } else {
        // Handle unknown, non-request errors.
        Logger.error(
          `Unknown bridge error calling \`${url}\``,
          error,
          LOG_CONTEXT,
        );
        throw error;
      }
    }
  }

  private createHmacBySecretKey(
    secretKey: string,
    timestamp: number,
    payload: unknown,
  ) {
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
  private getBridgeUrl(
    environmentBridgeUrl: string,
    environmentId: string,
    workflowOrigin: WorkflowOriginEnum,
    statelessBridgeUrl?: string,
  ): string {
    if (statelessBridgeUrl) {
      return statelessBridgeUrl;
    }

    switch (workflowOrigin) {
      case WorkflowOriginEnum.NOVU_CLOUD:
        return `${this.getApiUrl()}/environments/${environmentId}/bridge`;
      case WorkflowOriginEnum.EXTERNAL:
      default:
        // default is treated as an external workflow for backwards compatibility
        return environmentBridgeUrl;
    }
  }

  private getApiUrl(): string {
    const apiUrl = process.env.API_URL;

    if (!apiUrl) {
      throw new Error('API_URL is not set');
    }

    return apiUrl;
  }
}
