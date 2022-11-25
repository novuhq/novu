import { Injectable } from '@nestjs/common';
import { MessageTemplateEntity, MessageTemplateRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { CreateMessageTemplateCommand } from './create-message-template.command';
import { sanitizeMessageContent } from '../../shared/sanitizer.service';
import { CreateChange } from '../../../change/usecases/create-change.usecase';
import { CreateChangeCommand } from '../../../change/usecases/create-change.command';
import { UpdateChange } from '../../../change/usecases/update-change/update-change';
import { UpdateChangeCommand } from '../../../change/usecases/update-change/update-change.command';

@Injectable()
export class CreateMessageTemplate {
  constructor(
    private messageTemplateRepository: MessageTemplateRepository,
    private createChange: CreateChange,
    private updateChange: UpdateChange
  ) {}

  async execute(command: CreateMessageTemplateCommand): Promise<MessageTemplateEntity> {
    let item = await this.messageTemplateRepository.create({
      cta: command.cta,
      name: command.name,
      variables: command.variables,
      content: command.contentType === 'editor' ? sanitizeMessageContent(command.content) : command.content,
      contentType: command.contentType,
      subject: command.subject,
      title: command.title,
      type: command.type,
      _feedId: command.feedId ? command.feedId : null,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _creatorId: command.userId,
      preheader: command.preheader,
      actor: command.actor,
    });

    item = await this.messageTemplateRepository.findById(item._id);
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

    return item;
  }
}
