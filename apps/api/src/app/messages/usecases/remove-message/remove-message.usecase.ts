import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { buildFeedKey, buildMessageCountKey, InvalidateCacheService } from '@novu/application-generic';

import { RemoveMessageCommand } from './remove-message.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class RemoveMessage {
  constructor(private invalidateCache: InvalidateCacheService, private messageRepository: MessageRepository) {}

  async execute(command: RemoveMessageCommand) {
    const message = await this.messageRepository.findMessageById({
      _environmentId: command.environmentId,
      _id: command.messageId,
    });
    if (!message) {
      throw new NotFoundException(`Message with id ${command.messageId} not found`);
    }

    if (!message.subscriber) throw new ApiException(`A subscriber was not found for message ${command.messageId}`);

    await this.invalidateCache.invalidateQuery({
      key: buildFeedKey().invalidate({
        subscriberId: message.subscriber.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    await this.invalidateCache.invalidateQuery({
      key: buildMessageCountKey().invalidate({
        subscriberId: message.subscriber.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    await this.messageRepository.delete({
      _environmentId: command.environmentId,
      _id: command.messageId,
    });

    return {
      acknowledged: true,
      status: 'deleted',
    };
  }
}
