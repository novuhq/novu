import { Injectable } from '@nestjs/common';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';
import { MessageTemplateEntity, LayoutRepository, MessageTemplateRepository, FeedRepository } from '@novu/dal';

@Injectable()
export class PromoteMessageTemplateChange {
  constructor(
    private messageTemplateRepository: MessageTemplateRepository,
    private feedRepository: FeedRepository,
    private layoutRepository: LayoutRepository
  ) {}

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

    const layout = await this.layoutRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _parentId: newItem._layoutId,
    });

    if (!item) {
      if (newItem.deleted) {
        return;
      }

      return this.messageTemplateRepository.create({
        type: newItem.type,
        name: newItem.name,
        subject: newItem.subject,
        content: newItem.content,
        contentType: newItem.contentType,
        title: newItem.title,
        preheader: newItem.preheader,
        senderName: newItem.senderName,
        cta: newItem.cta,
        active: newItem.active,
        actor: newItem.actor,
        variables: newItem.variables,
        _parentId: newItem._id,
        _feedId: feed?._id,
        _layoutId: layout?._id,
        _environmentId: command.environmentId,
        _creatorId: command.userId,
        _organizationId: command.organizationId,
      });
    }

    const count = await this.messageTemplateRepository.count({
      _organizationId: command.organizationId,
      _id: command.item._id,
    });

    if (count === 0) {
      await this.messageTemplateRepository.delete({
        _id: item._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      });

      return;
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
        preheader: newItem.preheader,
        senderName: newItem.senderName,
        active: newItem.active,
        actor: newItem.actor,
        variables: newItem.variables,
        _feedId: feed?._id,
        _layoutId: layout?._id,
      }
    );
  }
}
