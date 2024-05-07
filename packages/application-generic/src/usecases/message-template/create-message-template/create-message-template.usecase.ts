import { Injectable } from '@nestjs/common';
import {
  MessageTemplateEntity,
  MessageTemplateRepository,
  LayoutRepository,
} from '@novu/dal';
import {
  ChangeEntityTypeEnum,
  IMessageAction,
  StepTypeEnum,
  WorkflowTypeEnum,
} from '@novu/shared';

import { CreateMessageTemplateCommand } from './create-message-template.command';
import { CreateChange, CreateChangeCommand } from '../../create-change';
import { UpdateChange, UpdateChangeCommand } from '../../update-change';
import { sanitizeMessageContent } from '../../../services';
import { normalizeVariantDefault } from '../../../utils/variants';
import { ApiException } from '../../../utils/exceptions';

@Injectable()
export class CreateMessageTemplate {
  constructor(
    private messageTemplateRepository: MessageTemplateRepository,
    private layoutRepository: LayoutRepository,
    private createChange: CreateChange,
    private updateChange: UpdateChange
  ) {}

  async execute(
    command: CreateMessageTemplateCommand
  ): Promise<MessageTemplateEntity> {
    if ((command?.cta?.action as IMessageAction | undefined | '') === '') {
      throw new ApiException('Please provide a valid CTA action');
    }

    let layoutId: string | undefined | null;
    if (command.type === StepTypeEnum.EMAIL && !command.layoutId) {
      const defaultLayout = await this.layoutRepository.findDefault(
        command.environmentId,
        command.organizationId
      );
      layoutId = defaultLayout?._id;
    } else {
      layoutId = command.layoutId;
    }

    let item: MessageTemplateEntity =
      await this.messageTemplateRepository.create({
        cta: command.cta,
        name: command.name,
        variables: command.variables
          ? normalizeVariantDefault(command.variables)
          : undefined,
        content:
          command.contentType === 'editor'
            ? sanitizeMessageContent(command.content)
            : command.content,
        contentType: command.contentType,
        subject: command.subject,
        title: command.title,
        type: command.type,
        _feedId: command.feedId ? command.feedId : null,
        _layoutId: layoutId,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        _creatorId: command.userId,
        preheader: command.preheader,
        senderName: command.senderName,
        inputs: command.inputs,
        output: command.output,
        actor: command.actor,
      });

    if (item?._id) {
      item = (await this.messageTemplateRepository.findOne({
        _id: item._id,
        _organizationId: command.organizationId,
      })) as MessageTemplateEntity;
    }

    if (command.workflowType !== WorkflowTypeEnum.ECHO) {
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
}
