import { Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository, MessageTemplateEntity } from '@novu/dal';
import { MarkActionAsDoneCommand } from './mark-action-as-done.command';
import { MessageActionStatusEnum } from '@novu/shared';

@Injectable()
export class MarkActionAsDone {
  constructor(private messageRepository: MessageRepository) {}

  async execute(command: MarkActionAsDoneCommand): Promise<MessageEntity> {
    const updatePayload: Partial<MessageTemplateEntity> = {};

    if (command.executedType) {
      updatePayload['cta.action.status'] = MessageActionStatusEnum.DONE;
      updatePayload['cta.action.executedType'] = command.executedType;
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
