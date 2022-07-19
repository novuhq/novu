import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { GetUnseenCountCommand } from './get-unseen-count.command';

@Injectable()
export class GetUnseenCount {
  constructor(private messageRepository: MessageRepository) {}

  async execute(command: GetUnseenCountCommand): Promise<{ count: number }> {
    const count = await this.messageRepository.getUnseenCount(
      command.environmentId,
      command.subscriberId,
      ChannelTypeEnum.IN_APP,
      { feedId: command.feedId, seen: command.seen }
    );

    return { count };
  }
}
