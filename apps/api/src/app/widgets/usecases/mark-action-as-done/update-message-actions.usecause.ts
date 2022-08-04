import { Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository, MessageTemplateEntity } from '@novu/dal';
import { UpdateMessageActionsCommand } from './update-message-actions.command';

@Injectable()
export class UpdateMessageActions {
  constructor(private messageRepository: MessageRepository) {}

  async execute(command: UpdateMessageActionsCommand): Promise<MessageEntity> {
    const updatePayload: Partial<MessageTemplateEntity> = {};

    if (command.type) {
      updatePayload['cta.action.result.type'] = command.type;
    }

    if (command.status) {
      updatePayload['cta.action.status'] = command.status;
    }

    if (command.payload) {
      updatePayload['cta.action.result.payload'] = command.payload;
    }

    await this.messageRepository.update(
      {
        _subscriberId: command.subscriberId,
        _id: command.messageId,
      },
      {
        $set: updatePayload,
      }
    );

    return await this.messageRepository.findById(command.messageId);
  }
}
