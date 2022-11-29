import { Injectable } from '@nestjs/common';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';
import { MessageTemplateEntity, MessageTemplateRepository, FeedRepository } from '@novu/dal';

@Injectable()
export class PromoteMessageTemplateChange {
  constructor(private messageTemplateRepository: MessageTemplateRepository, private feedRepository: FeedRepository) {}

  async execute(command: PromoteTypeChangeCommand) {
    const item = await this.messageTemplateRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.item._id,
    });

    const newItem = command.item as MessageTemplateEntity;

    const feedDev = await this.feedRepository.findOne({
      _id: newItem._feedId,
      _organizationId: command.organizationId,
    });

    const feed = await this.feedRepository.findOne({
      _environmentId: command.environmentId,
      identifier: feedDev?.identifier,
    });

    if (!item) {
      return this.messageTemplateRepository.create({
        type: newItem.type,
        name: newItem.name,
        subject: newItem.subject,
        content: newItem.content,
        contentType: newItem.contentType,
        title: newItem.title,
        cta: newItem.cta,
        active: newItem.active,
        _parentId: newItem._id,
        _feedId: feed?._id,
        _environmentId: command.environmentId,
        _creatorId: command.userId,
        _organizationId: command.organizationId,
      });
    }

    return this.messageTemplateRepository.update(
      {
        _environmentId: command.environmentId,
        _id: item._id,
      },
      {
        type: newItem.type,
        name: newItem.name,
        subject: newItem.subject,
        content: newItem.content,
        contentType: newItem.contentType,
        title: newItem.title,
        cta: newItem.cta,
        active: newItem.active,
        _feedId: feed?._id,
      }
    );
  }
}
