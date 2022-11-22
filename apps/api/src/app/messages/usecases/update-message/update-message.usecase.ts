import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { InvalidateCache } from '../../../shared/interceptors';
import { UpdateMessageCommand } from './update-message.commad';

@Injectable()
export class UpdateMessage {
  constructor(private messageRepository: MessageRepository) {}

  @InvalidateCache('messages-feed')
  async execute(command: UpdateMessageCommand) {
    return await this.messageRepository.update(command.query, command.updateBody);
  }
}
