import { Injectable } from '@nestjs/common';
import { NotificationTemplateRepository } from '@novu/dal';
import { ChangeEntityTypeEnum, INotificationTrigger, TriggerTypeEnum } from '@novu/shared';
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
    const variables = contentService.extractMessageVariables(command.steps);
    const subscriberVariables = contentService.extractSubscriberMessageVariables(command.steps);

    const triggerIdentifier = `${slugify(command.name, {
      lower: true,
      strict: true,
    })}`;
    const templateCheckIdentifier = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      triggerIdentifier
    );
    const trigger: INotificationTrigger = {
      type: TriggerTypeEnum.EVENT,
      identifier: `${triggerIdentifier}${!templateCheckIdentifier ? '' : '-' + shortid.generate()}`,
      variables: variables.map((i) => {
        return {
          name: i,
        };
      }),
      subscriberVariables: subscriberVariables.map((i) => {
        return {
          name: i,
        };
      }),
    };

    const parentChangeId: string = NotificationTemplateRepository.createObjectId();
    const templateSteps = [];
    let parentStepId: string | null = null;

    for (const message of command.steps) {
      const template = await this.createMessageTemplate.execute(
        CreateMessageTemplateCommand.create({
          type: message.template.type,
          name: message.template.name,
          content: message.template.content,
          contentType: message.template.contentType,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          cta: message.template.cta,
          subject: message.template.subject,
          parentChangeId,
        })
      );

      const stepId = template._id;
      templateSteps.push({
        _id: stepId,
        _templateId: template._id,
        filters: message.filters,
        _parentId: parentStepId,
        metadata: message.metadata,
      });
      parentStepId = stepId;
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
      steps: templateSteps,
      triggers: [trigger],
      _notificationGroupId: command.notificationGroupId,
    });

    const item = await this.notificationTemplateRepository.findOne({
      _id: savedTemplate._id,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    await this.createChange.execute(
      CreateChangeCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
        item,
        changeId: parentChangeId,
      })
    );

    return await this.notificationTemplateRepository.findById(savedTemplate._id, command.organizationId);
  }
}
