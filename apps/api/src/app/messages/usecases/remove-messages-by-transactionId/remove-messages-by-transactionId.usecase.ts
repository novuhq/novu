import { Injectable, NotFoundException } from '@nestjs/common';
import { buildFeedKey, buildMessageCountKey, InvalidateCacheService } from '@novu/application-generic';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { RemoveMessagesByTransactionIdCommand } from './remove-messages-by-transactionId.command';

@Injectable()
export class RemoveMessagesByTransactionId {
  constructor(private messageRepository: MessageRepository, private invalidateCache: InvalidateCacheService) {}

  async execute(command: RemoveMessagesByTransactionIdCommand) {
    const subscriberIds = await this.messageRepository.find(
      {
        transactionId: command.transactionId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        deleted: false,
        ...(command.channel && { channel: command.channel }),
      },
      '_subscriberId'
    );

    if (subscriberIds.length === 0) {
      throw new NotFoundException('Invalid transactionId or channel');
    }

    for (const subscriberId of subscriberIds) {
      await this.invalidateCache.invalidateQuery({
        key: buildFeedKey().invalidate({
          subscriberId: subscriberId._subscriberId,
          _environmentId: command.environmentId,
        }),
      });

      await this.invalidateCache.invalidateQuery({
        key: buildMessageCountKey().invalidate({
          subscriberId: subscriberId._subscriberId,
          _environmentId: command.environmentId,
        }),
      });
    }

    const deleteQuery: Partial<MessageEntity> = {
      transactionId: command.transactionId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    if (command.channel) {
      deleteQuery.channel = command.channel;
    }

    await this.messageRepository.deleteMany(deleteQuery);

    return {
      acknowledged: true,
      status: 'deleted',
    };
  }
}
