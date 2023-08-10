import { Injectable } from '@nestjs/common';

import { MessageRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { BullMqService } from '@novu/application-generic';

import { ExternalServicesRouteCommand } from './external-services-route.command';
import { WSGateway } from '../../ws.gateway';

@Injectable()
export class ExternalServicesRoute {
  public readonly bullMqService: BullMqService;

  constructor(private wsGateway: WSGateway, private messageRepository: MessageRepository) {
    this.bullMqService = new BullMqService();
  }
  public async execute(command: ExternalServicesRouteCommand) {
    if (command.event === 'unseen_count_changed') {
      await this.sendUnseenCountChange(command);

      return;
    }

    if (command.event === 'unread_count_changed') {
      await this.sendUnreadCountChange(command);

      return;
    }

    await this.wsGateway.sendMessage(command.userId, command.event, command.payload);
  }

  private async sendUnreadCountChange(command: ExternalServicesRouteCommand) {
    if (!command._environmentId) {
      return;
    }

    const connection = await this.connectionExist(command);

    if (!connection) {
      return;
    }

    let unreadCount = this.extractCount(command.payload?.unreadCount);

    if (unreadCount === undefined) {
      unreadCount = await this.messageRepository.getCount(
        command._environmentId,
        command.userId,
        ChannelTypeEnum.IN_APP,
        { read: false },
        { limit: 1000 }
      );
    }
    await this.wsGateway.sendMessage(command.userId, command.event, {
      unreadCount,
    });
  }

  private async sendUnseenCountChange(command: ExternalServicesRouteCommand) {
    if (!command._environmentId) {
      return;
    }

    const connection = await this.connectionExist(command);

    if (!connection) {
      return;
    }

    let unseenCount = this.extractCount(command.payload?.unseenCount);

    if (unseenCount === undefined) {
      unseenCount = await this.messageRepository.getCount(
        command._environmentId,
        command.userId,
        ChannelTypeEnum.IN_APP,
        { seen: false },
        { limit: 1000 }
      );
    }

    await this.wsGateway.sendMessage(command.userId, command.event, {
      unseenCount,
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

  private async connectionExist(command: ExternalServicesRouteCommand) {
    return !!(await this.wsGateway.server.sockets.in(command.userId).fetchSockets()).length;
  }
}
