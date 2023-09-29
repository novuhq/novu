import { Injectable, NotFoundException } from '@nestjs/common';
import { buildFeedKey, buildMessageCountKey, InvalidateCacheService } from '@novu/application-generic';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { RemoveMessagesByTransactionIdCommand } from './remove-messages-by-transactionId.command';

@Injectable()
export class RemoveMessagesByTransactionId {
  constructor(private messageRepository: MessageRepository, private invalidateCache: InvalidateCacheService) {}

  async execute(command: RemoveMessagesByTransactionIdCommand) {
    const messages = await this.messageRepository.findMessagesByTransactionId({
      transactionId: [command.transactionId],
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      ...(command.channel && { channel: command.channel }),
    });

    if (messages.length === 0) {
      throw new NotFoundException('Invalid transactionId or channel');
    }

    for (const message of messages) {
      const subscriberId = message.subscriber?.subscriberId;
      if (subscriberId) {
        await this.invalidateCache.invalidateQuery({
          key: buildFeedKey().invalidate({
            subscriberId,
            _environmentId: command.environmentId,
          }),
        });

        await this.invalidateCache.invalidateQuery({
          key: buildMessageCountKey().invalidate({
            subscriberId,
            _environmentId: command.environmentId,
          }),
        });
      }
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
  }
}
