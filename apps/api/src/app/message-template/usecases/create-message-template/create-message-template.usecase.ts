import { Injectable } from '@nestjs/common';
import { MessageTemplateEntity, MessageTemplateRepository } from '@novu/dal';
import { ChangeEntityTypeEnum, IMessageAction } from '@novu/shared';

import { CreateMessageTemplateCommand } from './create-message-template.command';
import { sanitizeMessageContent } from '../../shared/sanitizer.service';
import { UpdateChange } from '../../../change/usecases/update-change/update-change';
import { UpdateChangeCommand } from '../../../change/usecases/update-change/update-change.command';
import { UpdateMessageTemplate } from '../update-message-template/update-message-template.usecase';
import { ApiException, CreateChange, CreateChangeCommand } from '@novu/application-generic';

@Injectable()
export class CreateMessageTemplate {
  constructor(
    private messageTemplateRepository: MessageTemplateRepository,
    private createChange: CreateChange,
    private updateChange: UpdateChange
  ) {}

  async execute(command: CreateMessageTemplateCommand): Promise<MessageTemplateEntity> {
    if ((command?.cta?.action as IMessageAction | undefined | '') === '') {
      throw new ApiException('Please provide a valid CTA action');
    }

    let item: MessageTemplateEntity = await this.messageTemplateRepository.create({
      cta: command.cta,
      name: command.name,
      variables: command.variables ? UpdateMessageTemplate.mapVariables(command.variables) : undefined,
      content: command.contentType === 'editor' ? sanitizeMessageContent(command.content) : command.content,
      contentType: command.contentType,
      subject: command.subject,
      title: command.title,
      type: command.type,
      _feedId: command.feedId ? command.feedId : null,
      _layoutId: command.layoutId || null,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _creatorId: command.userId,
      preheader: command.preheader,
      senderName: command.senderName,
      actor: command.actor,
    });

    if (item?._id) {
      item = (await this.messageTemplateRepository.findOne({
        _id: item._id,
        _organizationId: command.organizationId,
      })) as MessageTemplateEntity;
    }

    await this.createChange.execute(
      CreateChangeCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        item,
        type: ChangeEntityTypeEnum.MESSAGE_TEMPLATE,
        parentChangeId: command.parentChangeId,
        changeId: MessageTemplateRepository.createObjectId(),
      })
    );

    if (command.feedId) {
      await this.updateChange.execute(
        UpdateChangeCommand.create({
          _entityId: command.feedId,
          type: ChangeEntityTypeEnum.FEED,
          parentChangeId: command.parentChangeId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
        })
      );
    }

    if (command.layoutId) {
      await this.updateChange.execute(
        UpdateChangeCommand.create({
          _entityId: command.layoutId,
          type: ChangeEntityTypeEnum.LAYOUT,
          parentChangeId: command.parentChangeId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
        })
      );
    }

    return item;
  }
}
