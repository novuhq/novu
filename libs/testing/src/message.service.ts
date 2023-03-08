import { MessageEntity, MessageRepository } from '@novu/dal';

export class MessageService {
  private messageRepository = new MessageRepository();

  async findMessagesByTransactionId(
    environmentId: string,
    organizationId: string,
    transactionId: string
  ): Promise<MessageEntity[]> {
    return await this.messageRepository.findMessagesByTransactionId({
      _environmentId: environmentId,
      _organizationId: organizationId,
      transactionId,
    });
  }
}
