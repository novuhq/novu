import { Injectable } from '@nestjs/common';

import { MessageRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { BullMqService } from '@novu/application-generic';

import { SendMessageRouteCommand } from './send-message-route.command';
import { WSGateway } from '../ws.gateway';

@Injectable()
export class SendMessageRoute {
  public readonly bullMqService: BullMqService;

  constructor(private wsGateway: WSGateway, private messageRepository: MessageRepository) {
    this.bullMqService = new BullMqService();
  }
  public async execute(command: SendMessageRouteCommand) {
    const notCountMessage = !command.event.includes('_count_changed');

    if (notCountMessage) {
      await this.wsGateway.sendMessage(command.userId, command.event, command.payload);

      return;
    }

    const connectionLength = (await this.wsGateway.server.sockets.in(command.userId).fetchSockets()).length;

    if (!connectionLength || !command._environmentId) {
      return;
    }

    if (command.event === 'unseen_count_changed') {
      const unseenCount = await this.messageRepository.getCount(
        command._environmentId,
        command.userId,
        ChannelTypeEnum.IN_APP,
        { seen: false },
        { limit: 1000 }
      );

      await this.wsGateway.sendMessage(command.userId, command.event, {
        unseenCount,
      });
    }

    if (command.event === 'unread_count_changed') {
      const unreadCount = await this.messageRepository.getCount(
        command._environmentId,
        command.userId,
        ChannelTypeEnum.IN_APP,
        { read: false },
        { limit: 1000 }
      );

      await this.wsGateway.sendMessage(command.userId, command.event, {
        unreadCount,
      });
    }
  }
}
