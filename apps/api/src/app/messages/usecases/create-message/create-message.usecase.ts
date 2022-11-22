import { Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { CreateMessageCommand } from './create-message.command';
import { InvalidateCache } from '../../../shared/interceptors';

@Injectable()
export class CreateMessage {
  constructor(private messageRepository: MessageRepository) {}

  @InvalidateCache('messages-feed')
  async execute(command: CreateMessageCommand) {
    return await this.messageRepository.create({
      _notificationId: command._notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
      _messageTemplateId: command._messageTemplateId,
      channel: command.channel,
      cta: command.cta,
      _feedId: command._feedId,
      transactionId: command.transactionId,
      content: command.content,
      payload: command.payload,
      templateIdentifier: command.templateIdentifier,
      _jobId: command._jobId,
      actor: command.actor,
    });
  }
}
