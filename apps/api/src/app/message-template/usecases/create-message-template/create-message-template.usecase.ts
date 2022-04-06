import { Injectable } from '@nestjs/common';
import { MessageTemplateEntity, MessageTemplateRepository } from '@novu/dal';
import { CreateMessageTemplateCommand } from './create-message-template.command';
import { sanitizeMessageContent } from '../../shared/sanitizer.service';

@Injectable()
export class CreateMessageTemplate {
  constructor(private messageTemplateRepository: MessageTemplateRepository) {}

  async execute(command: CreateMessageTemplateCommand): Promise<MessageTemplateEntity> {
    return await this.messageTemplateRepository.create({
      cta: command.cta,
      name: command.name,
      content: command.contentType === 'editor' ? sanitizeMessageContent(command.content) : command.content,
      contentType: command.contentType,
      subject: command.subject,
      type: command.type,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _creatorId: command.userId,
    });
  }
}
