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

type UnseenCountPaginationIndication = {
  unseenCount: number;
  hasMore: boolean;
};

export interface SendMessageParams {
  userId: string;
  event: string;
  data: any;
  organizationId?: string;
  environmentId?: string;
  subscriberId?: string;
  contextKeys: string[];
}

@Injectable()
export class SocketWorkerService {
  private readonly socketWorkerUrl: string | undefined;
  private readonly socketWorkerApiKey: string | undefined;
  private readonly UNREAD_COUNT_LIMIT = 101;
  private readonly UNREAD_COUNT_PAGINATION_THRESHOLD = 100;
  private readonly SEVERITY_COUNT_LIMIT = 99;
  private readonly HTTP_TIMEOUT_MS = 3000;
  private readonly HTTP_RETRY_LIMIT = 2;

  constructor(
    private featureFlagsService: FeatureFlagsService,
    private messageRepository: MessageRepository
  ) {
    this.socketWorkerUrl = process.env.SOCKET_WORKER_URL;
    this.socketWorkerApiKey = process.env.INTERNAL_SERVICES_API_KEY;
  }

  async sendMessage(params: SendMessageParams): Promise<void> {
    switch (params.event) {
      case WebSocketEventEnum.RECEIVED:
        return this.handleReceivedEvent(params);
      case WebSocketEventEnum.UNREAD:
        return this.handleUnreadEvent(params);
      case WebSocketEventEnum.UNSEEN:
        return this.handleUnseenEvent(params);
      default:
        return this.sendMessageInternal(params);
    }
  }

  private async handleReceivedEvent({
    userId,
    event,
    data,
    organizationId,
    environmentId,
    subscriberId,
    contextKeys,
  }: SendMessageParams): Promise<void> {
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
        this.sendUnseenCount(userId, environmentId, contextKeys, organizationId),
        this.sendUnreadCount(userId, environmentId, contextKeys, organizationId),
      ]);
    }
  }

  private async handleUnreadEvent({
    userId,
    environmentId,
    organizationId,
    contextKeys,
  }: SendMessageParams): Promise<void> {
    await this.sendUnreadCount(userId, environmentId, contextKeys, organizationId);
  }

  private async handleUnseenEvent({
    userId,
    environmentId,
    organizationId,
    contextKeys,
  }: SendMessageParams): Promise<void> {
    await this.sendUnseenCount(userId, environmentId, contextKeys, organizationId);
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

      Logger.debug(`Dispatching event ${event} to socket worker for user ${userId}`, LOG_CONTEXT);

      await got.post(`${this.socketWorkerUrl}/send`, {
        json: payload,
        headers: {
          Authorization: `Bearer ${this.socketWorkerApiKey}`,
        },
        responseType: 'json',
        http2: true,
        dnsCache: true,
        timeout: this.HTTP_TIMEOUT_MS,
        retry: {
          limit: this.HTTP_RETRY_LIMIT,
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
    contextKeys: string[],
    organizationId?: string
  ): Promise<void> {
    try {
      const [unreadCount, severityCounts] = await Promise.all([
        this.messageRepository.getCount(
          environmentId,
          userId,
          ChannelTypeEnum.IN_APP,
          { read: false },
          { limit: this.UNREAD_COUNT_LIMIT },
          contextKeys,
          undefined,
          'primary'
        ),
        this.messageRepository.getCountBySeverity(
          environmentId,
          userId,
          ChannelTypeEnum.IN_APP,
          { read: false, snoozed: false },
          { limit: this.SEVERITY_COUNT_LIMIT },
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
        unreadCount > this.UNREAD_COUNT_PAGINATION_THRESHOLD
          ? { unreadCount: this.UNREAD_COUNT_PAGINATION_THRESHOLD, hasMore: true }
          : { unreadCount, hasMore: false };

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
    contextKeys: string[],
    organizationId?: string
  ): Promise<void> {
    try {
      const unseenCount = await this.messageRepository.getCount(
        environmentId,
        userId,
        ChannelTypeEnum.IN_APP,
        { seen: false },
        { limit: this.UNREAD_COUNT_LIMIT },
        contextKeys,
        undefined,
        'primary'
      );

      const paginationIndication: UnseenCountPaginationIndication =
        unseenCount > this.UNREAD_COUNT_PAGINATION_THRESHOLD
          ? { unseenCount: this.UNREAD_COUNT_PAGINATION_THRESHOLD, hasMore: true }
          : { unseenCount, hasMore: false };

      await this.sendMessageInternal({
        userId,
        event: WebSocketEventEnum.UNSEEN,
        data: {
          unseenCount: paginationIndication.unseenCount,
          hasMore: paginationIndication.hasMore,
        },
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
    contextKeys: string[],
    organizationId?: string
  ): Promise<void> {
    return this.sendUnseenCountChange(userId, environmentId, contextKeys, organizationId);
  }

  async sendUnreadCount(
    userId: string,
    environmentId: string,
    contextKeys: string[],
    organizationId?: string
  ): Promise<void> {
    return this.sendUnreadCountChange(userId, environmentId, contextKeys, organizationId);
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

  async isLegacyWsDisabled(environmentId?: string, organizationId?: string): Promise<boolean> {
    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_LEGACY_WS_SERVICE_DISABLED,
      environment: { _id: environmentId },
      organization: { _id: organizationId },
      defaultValue: false,
    });
  }
}
