import { Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository, MessageTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UpdateMessageActionsCommand } from './update-message-actions.command';

@Injectable()
export class UpdateMessageActions {
  constructor(private messageRepository: MessageRepository, private subscriberRepository: SubscriberRepository) {}

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

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    await this.messageRepository.update(
      {
        _subscriberId: subscriber._id,
        _id: command.messageId,
      },
      {
        $set: updatePayload,
      }
    );

    return await this.messageRepository.findById(command.messageId);
  }
}
