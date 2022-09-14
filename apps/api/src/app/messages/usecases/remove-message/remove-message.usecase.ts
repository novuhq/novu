import { Injectable } from '@nestjs/common';
import { SubscriberRepository, DalException, MessageRepository } from '@novu/dal';
import { RemoveMessageCommand } from './remove-message.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class RemoveMessage {
  constructor(private messageRepository: MessageRepository) {}

  async execute(command: RemoveMessageCommand) {
    try {
      await this.messageRepository.delete({
        _environmentId: command.environmentId,
        _id: command.messageId,
      });
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return {
      acknowledged: true,
      status: 'deleted',
    };
  }
}
