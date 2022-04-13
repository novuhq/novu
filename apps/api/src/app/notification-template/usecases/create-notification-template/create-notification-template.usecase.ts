import { Injectable } from '@nestjs/common';
import { NotificationTemplateRepository } from '@novu/dal';
import { INotificationTrigger, TriggerTypeEnum } from '@novu/shared';
import slugify from 'slugify';
import * as shortid from 'shortid';
import { CreateNotificationTemplateCommand } from './create-notification-template.command';
import { ContentService } from '../../../shared/helpers/content.service';
import { CreateMessageTemplate } from '../../../message-template/usecases/create-message-template/create-message-template.usecase';
import { CreateMessageTemplateCommand } from '../../../message-template/usecases/create-message-template/create-message-template.command';
import { CreateChangeCommand } from '../../../change/usecases/create-change.command';
import { CreateChange } from '../../../change/usecases/create-change.usecase';

@Injectable()
export class CreateNotificationTemplate {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createMessageTemplate: CreateMessageTemplate,
    private createChange: CreateChange
  ) {}

  async execute(command: CreateNotificationTemplateCommand) {
    const contentService = new ContentService();
    const variables = contentService.extractMessageVariables(command.messages);

    const trigger: INotificationTrigger = {
      type: TriggerTypeEnum.EVENT,
      identifier: `${slugify(command.name, {
        lower: true,
        strict: true,
      })}-${shortid.generate()}`,
      variables: variables.map((i) => {
        return {
          name: i,
        };
      }),
    };

    const templateMessages = [];

    for (const message of command.messages) {
      const template = await this.createMessageTemplate.execute(
        CreateMessageTemplateCommand.create({
          type: message.type,
          name: message.name,
          content: message.content,
          contentType: message.contentType,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
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

    const savedTemplate = await this.notificationTemplateRepository.create({
      _organizationId: command.organizationId,
      _creatorId: command.userId,
      _environmentId: command.environmentId,
      name: command.name,
      active: command.active,
      draft: command.draft,
      tags: command.tags,
      description: command.description,
      messages: templateMessages,
      triggers: [trigger],
      _notificationGroupId: command.notificationGroupId,
    });

    const item = await this.notificationTemplateRepository.findById(savedTemplate._id, command.organizationId);

    await this.createChange.execute(
      CreateChangeCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        type: 'NotificationTemplate',
        item,
      })
    );

    return item;
  }
}
