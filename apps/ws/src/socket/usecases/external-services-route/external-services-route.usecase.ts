import { Injectable, Logger } from '@nestjs/common';

import { MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, WebSocketEventEnum } from '@novu/shared';

import { ExternalServicesRouteCommand } from './external-services-route.command';
import { WSGateway } from '../../ws.gateway';
import { IUnreadCountPaginationIndication, IUnseenCountPaginationIndication } from './types';

const LOG_CONTEXT = 'ExternalServicesRoute';

@Injectable()
export class ExternalServicesRoute {
  constructor(
    private wsGateway: WSGateway,
    private messageRepository: MessageRepository
  ) {}

  public async execute(command: ExternalServicesRouteCommand) {
    const isOnline = await this.connectionExist(command);

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
    let messageData: any = null;

    // TODO: Retro-compatibility for a bit just in case stalled messages
    if (message) {
      Logger.log('Sending full message in the payload', LOG_CONTEXT);
      messageData = command.payload;
    } else if (messageId) {
      Logger.log(`Sending messageId: ${messageId} in the payload, we need to retrieve the full message`, LOG_CONTEXT);
      const storedMessage = await this.messageRepository.findOne({
        _id: messageId,
        _environmentId: command._environmentId,
      });
      messageData = { message: storedMessage };
    }

    if (messageData) {
      // Send to Socket.io (socket worker communication now handled by WebSocketsQueueService)
      await this.wsGateway.sendMessage(command.userId, command.event, messageData);

      // Only recalculate the counts if we send a messageId/message.
      await this.sendUnseenCountChange(command);
      await this.sendUnreadCountChange(command);
    }
  }

  private async sendUnreadCountChange(command: ExternalServicesRouteCommand) {
    if (!command._environmentId) {
      return;
    }

    const unreadCount = await this.messageRepository.getCount(
      command._environmentId,
      command.userId,
      ChannelTypeEnum.IN_APP,
      { read: false },
      { limit: 101 }
    );
    const paginationIndication: IUnreadCountPaginationIndication =
      unreadCount > 100 ? { unreadCount: 100, hasMore: true } : { unreadCount, hasMore: false };

    const countData = {
      unreadCount: paginationIndication.unreadCount,
      hasMore: paginationIndication.hasMore,
    };

    // Send to Socket.io (socket worker communication now handled by WebSocketsQueueService)
    await this.wsGateway.sendMessage(command.userId, WebSocketEventEnum.UNREAD, countData);
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

    const countData = {
      unseenCount: paginationIndication.unseenCount,
      hasMore: paginationIndication.hasMore,
    };

    // Send to Socket.io (socket worker communication now handled by WebSocketsQueueService)
    await this.wsGateway.sendMessage(command.userId, WebSocketEventEnum.UNSEEN, countData);
  }

  private async connectionExist(command: ExternalServicesRouteCommand): Promise<boolean | undefined> {
    if (!this.wsGateway.server) {
      Logger.error('No sw server found, unable to check if connection exists', LOG_CONTEXT);

      return;
    }

    return !!(await this.wsGateway.server.in(command.userId).fetchSockets()).length;
  }
}
