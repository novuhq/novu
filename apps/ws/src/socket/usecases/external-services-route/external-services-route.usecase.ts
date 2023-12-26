import { Injectable, Logger } from '@nestjs/common';

import { MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, WebSocketEventEnum } from '@novu/shared';

import { ExternalServicesRouteCommand } from './external-services-route.command';
import { WSGateway } from '../../ws.gateway';
import { IUnreadCountPaginationIndication, IUnseenCountPaginationIndication } from './types';

const LOG_CONTEXT = 'ExternalServicesRoute';

@Injectable()
export class ExternalServicesRoute {
  constructor(private wsGateway: WSGateway, private messageRepository: MessageRepository) {}

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

    let unreadCount = this.extractCount(command.payload?.unreadCount);

    if (unreadCount === undefined) {
      unreadCount = await this.messageRepository.getCount(
        command._environmentId,
        command.userId,
        ChannelTypeEnum.IN_APP,
        { read: false },
        { limit: 101 }
      );
    }
    const paginationIndication: IUnreadCountPaginationIndication =
      unreadCount > 100 ? { unreadCount: 100, hasMore: true } : { unreadCount: unreadCount, hasMore: false };

    await this.wsGateway.sendMessage(command.userId, WebSocketEventEnum.UNREAD, {
      unreadCount: paginationIndication.unreadCount,
      hasMore: paginationIndication.hasMore,
    });
  }

  private async sendUnseenCountChange(command: ExternalServicesRouteCommand) {
    if (!command._environmentId) {
      Logger.warn('No environmentId found, unable to send unseen count', LOG_CONTEXT);

      return;
    }

    let unseenCount = this.extractCount(command.payload?.unseenCount);

    if (unseenCount === undefined) {
      unseenCount = await this.messageRepository.getCount(
        command._environmentId,
        command.userId,
        ChannelTypeEnum.IN_APP,
        { seen: false },
        { limit: 101 }
      );
    }

    const paginationIndication: IUnseenCountPaginationIndication =
      unseenCount > 100 ? { unseenCount: 100, hasMore: true } : { unseenCount: unseenCount, hasMore: false };

    await this.wsGateway.sendMessage(command.userId, WebSocketEventEnum.UNSEEN, {
      unseenCount: paginationIndication.unseenCount,
      hasMore: paginationIndication.hasMore,
    });
  }

  private extractCount(count: unknown): number | undefined {
    if (count === null || count === undefined) return undefined;

    if (typeof count === 'number') {
      return count;
    }

    if (typeof count === 'string') {
      return parseInt(count, 10);
    }
  }

  private async connectionExist(command: ExternalServicesRouteCommand): Promise<boolean | undefined> {
    if (!this.wsGateway.server) {
      Logger.error('No sw server found, unable to check if connection exists', LOG_CONTEXT);

      return;
    }

    return !!(await this.wsGateway.server.in(command.userId).fetchSockets()).length;
  }
}
