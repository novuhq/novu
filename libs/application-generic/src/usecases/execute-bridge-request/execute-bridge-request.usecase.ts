import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import got, { OptionsOfTextResponseBody, RequestError } from 'got';
import { createHmac } from 'crypto';

import {
  ExecuteBridgeRequestCommand,
  ExecuteBridgeRequestDto,
} from './execute-bridge-request.command';
import {
  PostActionEnum,
  HttpHeaderKeysEnum,
  HttpQueryKeysEnum,
  GetActionEnum,
} from '@novu/framework';
import { decryptApiKey } from '../../encryption';

export const DEFAULT_RETRIES_LIMIT = 3;
export const RETRYABLE_HTTP_CODES: number[] = [
  408, 413, 429, 500, 502, 503, 504, 521, 522, 524,
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
  async execute<T extends PostActionEnum | GetActionEnum>(
    command: ExecuteBridgeRequestCommand
  ): Promise<ExecuteBridgeRequestDto<T>> {
    const retriesLimit = command.retriesLimit || DEFAULT_RETRIES_LIMIT;
    const bridgeActionUrl = new URL(command.bridgeUrl);
    bridgeActionUrl.searchParams.set(HttpQueryKeysEnum.ACTION, command.action);
    Object.entries(command.searchParams || {}).forEach(([key, value]) => {
      bridgeActionUrl.searchParams.set(key, value);
    });

    const url = bridgeActionUrl.toString();
    const options: OptionsOfTextResponseBody = {
      timeout: 3000,
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

          return Math.pow(2, attemptCount) * 1000;
        },
        statusCodes: RETRYABLE_HTTP_CODES,
        errorCodes: [
          'ETIMEDOUT',
          'ECONNRESET',
          'EADDRINUSE',
          'ECONNREFUSED',
          'EPIPE',
          'ENOTFOUND',
          'ENETUNREACH',
          'EAI_AGAIN',
        ],
      },
      hooks: {
        afterResponse:
          command.afterResponse !== undefined ? [command.afterResponse] : [],
      },
    };

    const timestamp = Date.now();
    const novuSignatureHeader = `t=${timestamp},v1=${this.createHmacByApiKey(
      command.apiKey,
      timestamp,
      command.event || {}
    )}`;

    const request = [PostActionEnum.EXECUTE, PostActionEnum.PREVIEW].includes(
      command.action as PostActionEnum
    )
      ? got.post
      : got.get;

    const headers = {
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
        const body = JSON.parse(error.response.body as string);
        if (body.code === TUNNEL_ERROR_CODE) {
          // Handle known tunnel errors
          const tunnelBody = body as TunnelResponseError;
          Logger.error(
            `Could not establish tunnel connection for \`${url}\`. Error: \`${tunnelBody.message}\``,
            LOG_CONTEXT
          );
          throw new NotFoundException(
            // eslint-disable-next-line max-len
            `Unable to reach Bridge app. Run npx novu@latest dev in Local mode, or ensure your Bridge app deployment is available.`
          );
        } else {
          // Handle unknown bridge request errors
          Logger.error(
            `Unknown bridge request error calling \`${url}\`: \`${body}\``,
            LOG_CONTEXT
          );
          throw error;
        }
      } else {
        // Handle unknown errors
        Logger.error(
          `Unknown bridge error calling \`${url}\``,
          error,
          LOG_CONTEXT
        );
        throw error;
      }
    }
  }

  private createHmacByApiKey(secret: string, timestamp: number, payload: any) {
    const publicKey = timestamp + '.' + JSON.stringify(payload);

    return createHmac('sha256', decryptApiKey(secret))
      .update(publicKey)
      .digest('hex');
  }
}
