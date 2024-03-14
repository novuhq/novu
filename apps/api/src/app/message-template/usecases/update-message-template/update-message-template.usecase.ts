import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChangeRepository, MessageTemplateEntity, MessageTemplateRepository, MessageRepository } from '@novu/dal';
import { ChangeEntityTypeEnum, ITemplateVariable } from '@novu/shared';

import { UpdateMessageTemplateCommand } from './update-message-template.command';
import { sanitizeMessageContent } from '../../shared/sanitizer.service';
import { UpdateChangeCommand } from '../../../change/usecases/update-change/update-change.command';
import { UpdateChange } from '../../../change/usecases/update-change/update-change';
import { CreateChange, CreateChangeCommand } from '@novu/application-generic';

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
    const existingTemplate = await this.messageTemplateRepository.findOne({
      _id: command.templateId,
      _environmentId: command.environmentId,
    });
    if (!existingTemplate) throw new NotFoundException(`Message template with id ${command.templateId} not found`);

    const updatePayload: Partial<MessageTemplateEntity> = {};

    const unsetPayload: Partial<Record<keyof MessageTemplateEntity, string>> = {};

    if (command.name) {
      updatePayload.name = command.name;
    }

    if (command.content !== null || command.content !== undefined) {
      updatePayload.content =
        command.contentType === 'editor' ? sanitizeMessageContent(command.content) : command.content;
    }

    if (command.variables) {
      updatePayload.variables = UpdateMessageTemplate.mapVariables(command.variables);
    }

    if (command.contentType) {
      updatePayload.contentType = command.contentType;
    }

    if (command.cta) {
      updatePayload.cta = {
        ...(existingTemplate.cta && { cta: existingTemplate.cta }),
        ...command.cta,
      };
    } else if (existingTemplate.cta) {
      unsetPayload.cta = '';
    }

    if (command.feedId) {
      updatePayload._feedId = command.feedId;
    }

    if (!command.feedId && existingTemplate._feedId) {
      unsetPayload._feedId = '';
    }

    if (command.layoutId) {
      updatePayload._layoutId = command.layoutId;
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

    if (command.senderName !== undefined || command.senderName !== null) {
      updatePayload.senderName = command.senderName;
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
        _environmentId: command.environmentId,
      },
      {
        $set: updatePayload,
        $unset: unsetPayload,
      }
    );

    const item = await this.messageTemplateRepository.findOne({
      _id: command.templateId,
      _organizationId: command.organizationId,
    });
    if (!item) throw new NotFoundException(`Message template with id ${command.templateId} is not found`);

    if (command.feedId || (!command.feedId && existingTemplate._feedId)) {
      await this.messageRepository.updateFeedByMessageTemplateId(
        command.environmentId,
        command.templateId,
        command.feedId
      );
    }

    if (item._id) {
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
    }

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

  public static mapVariables(items: ITemplateVariable[]) {
    return items.map((item) => {
      if (item.defaultValue === '') {
        item.defaultValue = undefined;
      }

      return item;
    });
  }
}
