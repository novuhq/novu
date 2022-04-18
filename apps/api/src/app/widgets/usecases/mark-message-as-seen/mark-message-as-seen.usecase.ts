import { Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { QueueService } from '../../../shared/services/queue';
import { MarkMessageAsSeenCommand } from './mark-message-as-seen.command';

@Injectable()
export class MarkMessageAsSeen {
  constructor(private messageRepository: MessageRepository, private queueService: QueueService) {}

  async execute(command: MarkMessageAsSeenCommand): Promise<MessageEntity> {
    await this.messageRepository.changeSeenStatus(command.subscriberId, command.messageId, true);

    const count = await this.messageRepository.getUnseenCount(
      command.environmentId,
      command.subscriberId,
      ChannelTypeEnum.IN_APP
    );

    this.queueService.wsSocketQueue.add({
      event: 'unseen_count_changed',
      userId: command.subscriberId,
      payload: {
        unseenCount: count,
      },
    });

    return await this.messageRepository.findById(command.messageId);
  }
}
