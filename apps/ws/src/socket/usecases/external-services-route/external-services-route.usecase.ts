import { Injectable, Logger } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, FeatureFlagsKeysEnum, WebSocketEventEnum } from '@novu/shared';
import { WSGateway } from '../../ws.gateway';
import { ExternalServicesRouteCommand } from './external-services-route.command';
import { IUnreadCountPaginationIndication, IUnseenCountPaginationIndication } from './types';

const LOG_CONTEXT = 'ExternalServicesRoute';

@Injectable()
export class ExternalServicesRoute {
  constructor(
    private wsGateway: WSGateway,
    private messageRepository: MessageRepository,
    private featureFlagsService: FeatureFlagsService
  ) {}

  public async execute(command: ExternalServicesRouteCommand) {
    const isOnline = await this.connectionExist(command);

    if (!isOnline) {
      Logger.log(`Connection does not exist, ignoring command for ${command.userId}`, LOG_CONTEXT);

      return;
    }

    if (command.event === WebSocketEventEnum.RECEIVED) {
      await this.processReceivedEvent(command);
    }

    if (command.event === WebSocketEventEnum.UNSEEN) {
      await this.sendUnseenCountChange(command);
    }

    if (command.event === WebSocketEventEnum.UNREAD) {
      await this.sendUnreadCountChange(command);
    }
  }

  private async processReceivedEvent(command: ExternalServicesRouteCommand): Promise<void> {
    const { message, messageId } = command.payload || {};
    // TODO: Retro-compatibility for a bit just in case stalled messages
    if (message) {
      Logger.log('Sending full message in the payload', LOG_CONTEXT);
      await this.wsGateway.sendMessage(command.userId, command.event, command.payload);
    } else if (messageId) {
      Logger.log(`Sending messageId: ${messageId} in the payload, we need to retrieve the full message`, LOG_CONTEXT);
      const storedMessage = await this.messageRepository.findOne({
        _id: messageId,
        _environmentId: command._environmentId,
      });
      await this.wsGateway.sendMessage(command.userId, command.event, { message: storedMessage });
    }

    // Only recalculate the counts if we send a messageId/message.
    if (message || messageId) {
      await this.sendUnseenCountChange(command);
      await this.sendUnreadCountChange(command);
    }
  }

  private async sendUnreadCountChange(command: ExternalServicesRouteCommand) {
    if (!command._environmentId) {
      return;
    }

    const isNotificationSeverityEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_NOTIFICATION_SEVERITY_ENABLED,
      defaultValue: false,
      environment: { _id: command._environmentId },
    });

    const severityCountsPromise = isNotificationSeverityEnabled
      ? this.messageRepository.getCountBySeverity(
          command._environmentId,
          command.userId,
          ChannelTypeEnum.IN_APP,
          { read: false, snoozed: false },
          { limit: 99 }
        )
      : Promise.resolve([]);

    const [unreadCount, severityCounts] = await Promise.all([
      this.messageRepository.getCount(
        command._environmentId,
        command.userId,
        ChannelTypeEnum.IN_APP,
        { read: false },
        { limit: 101 },
        undefined,
        'primary'
      ),
      severityCountsPromise,
    ]);

    const paginationIndication: IUnreadCountPaginationIndication =
      unreadCount > 100 ? { unreadCount: 100, hasMore: true } : { unreadCount, hasMore: false };

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

    await this.wsGateway.sendMessage(command.userId, WebSocketEventEnum.UNREAD, {
      unreadCount: paginationIndication.unreadCount,
      counts,
      hasMore: paginationIndication.hasMore,
    });
  }

  private async sendUnseenCountChange(command: ExternalServicesRouteCommand) {
    if (!command._environmentId) {
      Logger.warn('No environmentId found, unable to send unseen count', LOG_CONTEXT);

      return;
    }

    const unseenCount = await this.messageRepository.getCount(
      command._environmentId,
      command.userId,
      ChannelTypeEnum.IN_APP,
      { seen: false },
      { limit: 101 }
    );

    const paginationIndication: IUnseenCountPaginationIndication =
      unseenCount > 100 ? { unseenCount: 100, hasMore: true } : { unseenCount, hasMore: false };

    await this.wsGateway.sendMessage(command.userId, WebSocketEventEnum.UNSEEN, {
      unseenCount: paginationIndication.unseenCount,
      hasMore: paginationIndication.hasMore,
    });
  }

  private async connectionExist(command: ExternalServicesRouteCommand): Promise<boolean | undefined> {
    if (!this.wsGateway.server) {
      Logger.error('No sw server found, unable to check if connection exists', LOG_CONTEXT);

      return;
    }

    return !!(await this.wsGateway.server.in(command.userId).fetchSockets()).length;
  }
}
