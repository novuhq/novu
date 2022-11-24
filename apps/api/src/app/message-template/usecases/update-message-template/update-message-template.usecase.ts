import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChangeRepository, MessageTemplateEntity, MessageTemplateRepository, MessageRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { UpdateMessageTemplateCommand } from './update-message-template.command';
import { sanitizeMessageContent } from '../../shared/sanitizer.service';
import { CreateChangeCommand } from '../../../change/usecases/create-change.command';
import { CreateChange } from '../../../change/usecases/create-change.usecase';
import { UpdateChangeCommand } from '../../../change/usecases/update-change/update-change.command';
import { UpdateChange } from '../../../change/usecases/update-change/update-change';

@Injectable()
export class UpdateMessageTemplate {
  constructor(
    private messageTemplateRepository: MessageTemplateRepository,
    private messageRepository: MessageRepository,
    private createChange: CreateChange,
    private changeRepository: ChangeRepository,
    private updateChange: UpdateChange
  ) {}

  async execute(command: UpdateMessageTemplateCommand): Promise<MessageTemplateEntity> {
    const existingTemplate = await this.messageTemplateRepository.findById(command.templateId);
    if (!existingTemplate) throw new NotFoundException(`Message template with id ${command.templateId} not found`);

    const updatePayload: Partial<MessageTemplateEntity> = {};
    if (command.name) {
      updatePayload.name = command.name;
    }

    if (command.content) {
      updatePayload.content =
        command.contentType === 'editor' ? sanitizeMessageContent(command.content) : command.content;
    }

    if (command.variables) {
      updatePayload.variables = command.variables;
    }

    if (command.contentType) {
      updatePayload.contentType = command.contentType;
    }

    if (command.cta) {
      if (command.cta.type) {
        updatePayload['cta.type'] = command.cta.type;
      }
      if (command.cta.data?.url) {
        updatePayload['cta.data.url'] = command.cta.data.url;
      }
      if (command.cta.action) {
        updatePayload['cta.action.status'] = command.cta.action.status;
        updatePayload['cta.action.buttons'] = command.cta.action.buttons;
      }
    }

    if (command.feedId) {
      updatePayload._feedId = command.feedId;
    }
    if (!command.feedId && existingTemplate._feedId) {
      updatePayload._feedId = null;
    }

    if (command.subject) {
      updatePayload.subject = command.subject;
    }

    if (command.title) {
      updatePayload.title = command.title;
    }

    if (command.preheader !== undefined || command.preheader !== null) {
      updatePayload.preheader = command.preheader;
    }

    if (command.actor) {
      updatePayload.actor = command.actor;
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

    const item = await this.messageTemplateRepository.findById(command.templateId);

    if (command.feedId || (!command.feedId && existingTemplate._feedId)) {
      await this.messageRepository.updateFeedByMessageTemplateId(
        command.environmentId,
        command.templateId,
        command.feedId
      );
    }

    const changeId = await this.changeRepository.getChangeId(
      command.environmentId,
      ChangeEntityTypeEnum.MESSAGE_TEMPLATE,
      item._id
    );

    await this.createChange.execute(
      CreateChangeCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        item,
        type: ChangeEntityTypeEnum.MESSAGE_TEMPLATE,
        parentChangeId: command.parentChangeId,
        changeId,
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
