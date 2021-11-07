import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageTemplateEntity, MessageTemplateRepository } from '@notifire/dal';
import { UpdateMessageTemplateCommand } from './update-message-template.command';
import { sanitizeMessageContent } from '../../shared/sanitizer.service';

@Injectable()
export class UpdateMessageTemplate {
  constructor(private messageTemplateRepository: MessageTemplateRepository) {}

  async execute(command: UpdateMessageTemplateCommand): Promise<MessageTemplateEntity> {
    const existingTemplate = await this.messageTemplateRepository.findById(command.templateId);
    if (!existingTemplate) throw new NotFoundException(`Entity with id ${command.templateId} not found`);

    const updatePayload: Partial<MessageTemplateEntity> = {};
    if (command.name) {
      updatePayload.name = command.name;
    }

    if (command.content) {
      updatePayload.content =
        command.contentType === 'editor' ? sanitizeMessageContent(command.content) : command.content;
    }

    if (command.cta) {
      updatePayload.cta = command.cta;
    }

    if (command.subject) {
      updatePayload.subject = command.subject;
    }

    if (!Object.keys(updatePayload).length) {
      throw new BadRequestException('No properties found for update');
    }

    await this.messageTemplateRepository.update(
      {
        _id: command.templateId,
        _organizationId: command.organizationId,
      },
      {
        $set: updatePayload,
      }
    );

    return await this.messageTemplateRepository.findById(command.templateId);
  }
}
