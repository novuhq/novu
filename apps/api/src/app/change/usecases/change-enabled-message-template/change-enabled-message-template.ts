import { Injectable } from '@nestjs/common';
import { TypeChangeEnabledCommand } from '../type-change-enabled.command';
import { MessageTemplateEntity, MessageTemplateRepository } from '@novu/dal';

@Injectable()
export class ChangeEnabledMessageTemplate {
  constructor(private messageTemplateRepository: MessageTemplateRepository) {}

  async execute(command: TypeChangeEnabledCommand) {
    const item = await this.messageTemplateRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.item._id,
    });

    const newItem = command.item as MessageTemplateEntity;

    if (!item) {
      return this.messageTemplateRepository.create({
        type: newItem.type,
        name: newItem.name,
        subject: newItem.subject,
        content: newItem.content,
        contentType: newItem.contentType,
        cta: newItem.cta,
        active: newItem.active,
        _parentId: newItem._id,
        _environmentId: command.environmentId,
        _creatorId: command.userId,
        _organizationId: command.organizationId,
      });
    }

    return this.messageTemplateRepository.update(
      {
        _id: item._id,
      },
      {
        type: newItem.type,
        name: newItem.name,
        subject: newItem.subject,
        content: newItem.content,
        contentType: newItem.contentType,
        cta: newItem.cta,
        active: newItem.active,
      }
    );
  }
}
