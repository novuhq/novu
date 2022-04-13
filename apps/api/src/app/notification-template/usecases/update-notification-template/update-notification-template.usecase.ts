// eslint-ignore max-len

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  NotificationStepEntity,
  ChangeEntityTypeEnum,
} from '@novu/dal';

import { UpdateNotificationTemplateCommand } from './update-notification-template.command';
import { ContentService } from '../../../shared/helpers/content.service';
import { CreateMessageTemplate } from '../../../message-template/usecases/create-message-template/create-message-template.usecase';
import { CreateMessageTemplateCommand } from '../../../message-template/usecases/create-message-template/create-message-template.command';
import { UpdateMessageTemplateCommand } from '../../../message-template/usecases/update-message-template/update-message-template.command';
import { UpdateMessageTemplate } from '../../../message-template/usecases/update-message-template/update-message-template.usecase';
import { CreateChange } from '../../../change/usecases/create-change.usecase';
import { CreateChangeCommand } from '../../../change/usecases/create-change.command';

@Injectable()
export class UpdateNotificationTemplate {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createMessageTemplate: CreateMessageTemplate,
    private updateMessageTemplate: UpdateMessageTemplate,
    private createChange: CreateChange
  ) {}

  async execute(command: UpdateNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    const existingTemplate = await this.notificationTemplateRepository.findById(
      command.templateId,
      command.organizationId
    );
    if (!existingTemplate) throw new NotFoundException(`Entity with id ${command.templateId} not found`);

    const updatePayload: Partial<NotificationTemplateEntity> = {};
    if (command.name) {
      updatePayload.name = command.name;
    }

    if (command.description) {
      updatePayload.description = command.description;
    }

    if (command.notificationGroupId) {
      updatePayload._notificationGroupId = command.notificationGroupId;
    }

    if (command.steps) {
      const contentService = new ContentService();
      const { steps } = command;

      const variables = contentService.extractMessageVariables(command.steps);

      updatePayload['triggers.0.variables'] = variables.map((i) => {
        return {
          name: i,
        };
      });

      const templateMessages: NotificationStepEntity[] = [];

      for (const message of steps) {
        if (message._id) {
          const template = await this.updateMessageTemplate.execute(
            UpdateMessageTemplateCommand.create({
              templateId: message._id,
              type: message.type,
              name: message.name,
              content: message.content,
              organizationId: command.organizationId,
              environmentId: command.environmentId,
              userId: command.userId,
              contentType: message.contentType,
              cta: message.cta,
              subject: message.subject,
            })
          );

          templateMessages.push({
            _templateId: template._id,
            filters: message.filters,
          });
        } else {
          const template = await this.createMessageTemplate.execute(
            CreateMessageTemplateCommand.create({
              type: message.type,
              name: message.name,
              content: message.content,
              organizationId: command.organizationId,
              environmentId: command.environmentId,
              contentType: message.contentType,
              userId: command.userId,
              cta: message.cta,
              subject: message.subject,
            })
          );

          templateMessages.push({
            _templateId: template._id,
            filters: message.filters,
          });
        }
      }
      updatePayload.steps = templateMessages;
    }

    if (command.tags) {
      updatePayload.tags = command.tags;
    }

    if (!Object.keys(updatePayload).length) {
      throw new BadRequestException('No properties found for update');
    }

    await this.notificationTemplateRepository.update(
      {
        _id: command.templateId,
        _organizationId: command.organizationId,
      },
      {
        $set: updatePayload,
      }
    );

    const item = await this.notificationTemplateRepository.findById(command.templateId, command.organizationId);

    await this.createChange.execute(
      CreateChangeCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        type: ChangeEntityTypeEnum.NOTIFICATIONTEMPLATE,
        item,
      })
    );

    return item;
  }
}
