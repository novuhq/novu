import { BadRequestException, Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { RemoveMessagesByTransactionIdCommand } from './remove-messages-by-transactionId.command';

@Injectable()
export class RemoveMessagesByTransactionId {
  constructor(private messageRepository: MessageRepository) {}

  async execute(command: RemoveMessagesByTransactionIdCommand) {
    const isValidTransactionId = await this.messageRepository.findOne({
      transactionId: command.transactionId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!isValidTransactionId) {
      throw new BadRequestException('Invalid transactionId');
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

    return 'Is working';
  }
}
