import { Injectable, Logger } from '@nestjs/common';
import got, { HTTPError, RequestError } from 'got';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { FeatureFlagsService } from '../feature-flags';

const LOG_CONTEXT = 'SocketWorkerService';

@Injectable()
export class SocketWorkerService {
  private readonly socketWorkerUrl: string | undefined;
  private readonly socketWorkerApiKey: string | undefined;

  constructor(private featureFlagsService?: FeatureFlagsService) {
    this.socketWorkerUrl = process.env.SOCKET_WORKER_URL;
    this.socketWorkerApiKey = process.env.SOCKET_WORKER_API_KEY;
  }

  async sendMessage(
    userId: string,
    event: string,
    data: any,
    organizationId?: string,
    environmentId?: string,
    subscriberId?: string
  ): Promise<void> {
    if (!this.socketWorkerUrl) {
      Logger.debug('Socket worker URL not configured, skipping dispatch', LOG_CONTEXT);

      return;
    }

    if (!this.socketWorkerApiKey) {
      Logger.error('Socket worker API key not configured, cannot dispatch', LOG_CONTEXT);

      return;
    }

    try {
      const payload = {
        userId,
        event,
        data,
        organizationId,
        environmentId,
        subscriberId,
      };

      Logger.log(`Dispatching event ${event} to socket worker for user ${userId}`, LOG_CONTEXT);

      await got.post(`${this.socketWorkerUrl}/send`, {
        json: payload,
        headers: {
          Authorization: `Bearer ${this.socketWorkerApiKey}`,
        },
        responseType: 'json',
        timeout: 5000, // 5 second timeout
        retry: {
          limit: 2,
          methods: ['POST'],
          statusCodes: [408, 429, 500, 502, 503, 504],
        },
      });

      Logger.debug(`Successfully dispatched event ${event} to socket worker for user ${userId}`, LOG_CONTEXT);
    } catch (error) {
      if (error instanceof HTTPError) {
        const { statusCode } = error.response;
        const errorText = error.response.body || error.message;

        if (statusCode === 401) {
          Logger.error(
            `Unauthorized request to socket worker - check API key configuration: ${errorText}`,
            LOG_CONTEXT
          );
        } else {
          Logger.error(`Failed to dispatch to socket worker: ${statusCode} - ${errorText}`, LOG_CONTEXT);
        }
      } else if (error instanceof RequestError) {
        Logger.error(`Request error dispatching to socket worker: ${error.message}`, LOG_CONTEXT);
      } else {
        Logger.error(
          `Error dispatching to socket worker: ${error instanceof Error ? error.message : String(error)}`,
          LOG_CONTEXT
        );
      }
    }
  }

  async isEnabled(organizationId?: string, environmentId?: string, userId?: string): Promise<boolean> {
    // First check if environment variables are configured
    const hasConfig = !!this.socketWorkerUrl && !!this.socketWorkerApiKey;

    if (!hasConfig) {
      return false;
    }

    // If no feature flag service is available, fall back to environment-only check
    if (!this.featureFlagsService) {
      return false;
    }

    if (process.env.NOVU_ENTERPRISE !== 'true') {
      return false;
    }

    try {
      const isFeatureFlagEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_CLOUDFLARE_SOCKETS_ENABLED,
        organization: organizationId ? { _id: organizationId } : undefined,
        environment: environmentId ? { _id: environmentId } : undefined,
        user: userId ? { _id: userId } : undefined,
        defaultValue: false,
      });

      return isFeatureFlagEnabled;
    } catch (error) {
      Logger.error(
        `Error checking socket worker feature flag: ${error instanceof Error ? error.message : String(error)}`,
        LOG_CONTEXT
      );

      // Fall back to environment-only check if feature flag service fails
      return true;
    }
  }
}
