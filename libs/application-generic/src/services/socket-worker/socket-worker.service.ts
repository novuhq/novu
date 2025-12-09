import { Injectable, Logger } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, FeatureFlagsKeysEnum, WebSocketEventEnum } from '@novu/shared';
import got, { HTTPError, RequestError } from 'got';

import { FeatureFlagsService } from '../feature-flags';

const LOG_CONTEXT = 'SocketWorkerService';

type UnreadCountPaginationIndication = {
  unreadCount: number;
  hasMore: boolean;
};

export interface SendMessageParams {
  userId: string;
  event: string;
  data: any;
  organizationId?: string;
  environmentId?: string;
  subscriberId?: string;
  contextKeys?: string[];
}

@Injectable()
export class SocketWorkerService {
  private readonly socketWorkerUrl: string | undefined;
  private readonly socketWorkerApiKey: string | undefined;

  constructor(
    private featureFlagsService: FeatureFlagsService,
    private messageRepository: MessageRepository
  ) {
    this.socketWorkerUrl = process.env.SOCKET_WORKER_URL;
    this.socketWorkerApiKey = process.env.INTERNAL_SERVICES_API_KEY;
  }

  async sendMessage({
    userId,
    event,
    data,
    organizationId,
    environmentId,
    subscriberId,
    contextKeys,
  }: SendMessageParams): Promise<void> {
    if (event === WebSocketEventEnum.RECEIVED) {
      const { messageId } = data || {};
      const storedMessage = await this.messageRepository.findOne({
        _id: messageId,
        _environmentId: environmentId,
      });

      if (!storedMessage) {
        Logger.error(`Message with id ${messageId} not found in environment ${environmentId}`, LOG_CONTEXT);

        return;
      }

      await this.sendMessageInternal({
        userId,
        event,
        data: { message: storedMessage },
        organizationId,
        environmentId,
        subscriberId,
        contextKeys,
      });

      // Only recalculate the counts if we send a messageId/message.
      if (messageId) {
        await Promise.all([
          this.sendUnseenCount(userId, environmentId, organizationId, contextKeys),
          this.sendUnreadCount(userId, environmentId, organizationId, contextKeys),
        ]);
      }
    } else if (event === WebSocketEventEnum.UNREAD) {
      await this.sendUnreadCount(userId, environmentId, organizationId, contextKeys);
    } else if (event === WebSocketEventEnum.UNSEEN) {
      await this.sendUnseenCount(userId, environmentId, organizationId, contextKeys);
    } else {
      await this.sendMessageInternal({
        userId,
        event,
        data,
        organizationId,
        environmentId,
        subscriberId,
        contextKeys,
      });
    }
  }

  private async sendMessageInternal({
    userId,
    event,
    data,
    organizationId,
    environmentId,
    subscriberId,
    contextKeys,
  }: SendMessageParams): Promise<void> {
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
        contextKeys,
      };

      Logger.log(`Dispatching event ${event} to socket worker for user ${userId}`, LOG_CONTEXT);

      await got.post(`${this.socketWorkerUrl}/send`, {
        json: payload,
        headers: {
          Authorization: `Bearer ${this.socketWorkerApiKey}`,
        },
        responseType: 'json',
        http2: true,
        dnsCache: true,
        timeout: 3000,
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

  private async sendUnreadCountChange(
    userId: string,
    environmentId: string,
    organizationId?: string,
    contextKeys?: string[]
  ): Promise<void> {
    try {
      const [unreadCount, severityCounts] = await Promise.all([
        this.messageRepository.getCount(
          environmentId,
          userId,
          ChannelTypeEnum.IN_APP,
          { read: false },
          { limit: 101 },
          contextKeys,
          undefined,
          'primary'
        ),
        this.messageRepository.getCountBySeverity(
          environmentId,
          userId,
          ChannelTypeEnum.IN_APP,
          { read: false, snoozed: false },
          { limit: 99 },
          contextKeys
        ),
      ]);

      const counts = {
        total: unreadCount,
        severity: {
          high: 0,
          medium: 0,
          low: 0,
          none: 0,
        },
      };

      for (const { severity, count } of severityCounts) {
        if (severity in counts.severity) {
          counts.severity[severity] = count;
        }
      }

      const paginationIndication: UnreadCountPaginationIndication =
        unreadCount > 100 ? { unreadCount: 100, hasMore: true } : { unreadCount, hasMore: false };

      await this.sendMessageInternal({
        userId,
        event: WebSocketEventEnum.UNREAD,
        data: {
          unreadCount: paginationIndication.unreadCount,
          counts,
          hasMore: paginationIndication.hasMore,
        },
        organizationId,
        environmentId,
        contextKeys,
      });
    } catch (error) {
      Logger.error(
        `Error sending unread count change: ${error instanceof Error ? error.message : String(error)}`,
        LOG_CONTEXT
      );
    }
  }

  private async sendUnseenCountChange(
    userId: string,
    environmentId: string,
    organizationId?: string,
    contextKeys?: string[]
  ): Promise<void> {
    try {
      await this.sendMessageInternal({
        userId,
        event: WebSocketEventEnum.UNSEEN,
        data: {},
        organizationId,
        environmentId,
        contextKeys,
      });
    } catch (error) {
      Logger.error(
        `Error sending unseen count change: ${error instanceof Error ? error.message : String(error)}`,
        LOG_CONTEXT
      );
    }
  }

  async sendUnseenCount(
    userId: string,
    environmentId: string,
    organizationId?: string,
    contextKeys?: string[]
  ): Promise<void> {
    return this.sendUnseenCountChange(userId, environmentId, organizationId, contextKeys);
  }

  async sendUnreadCount(
    userId: string,
    environmentId: string,
    organizationId?: string,
    contextKeys?: string[]
  ): Promise<void> {
    return this.sendUnreadCountChange(userId, environmentId, organizationId, contextKeys);
  }

  async isEnabled(environmentId?: string): Promise<boolean> {
    const hasConfig = !!this.socketWorkerUrl && !!this.socketWorkerApiKey;

    if (!hasConfig) {
      return false;
    }

    if (process.env.NOVU_ENTERPRISE !== 'true') {
      return false;
    }

    const isFeatureFlagEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CLOUDFLARE_SOCKETS_ENABLED,
      environment: { _id: environmentId },
      defaultValue: false,
    });

    return isFeatureFlagEnabled;
  }
}
