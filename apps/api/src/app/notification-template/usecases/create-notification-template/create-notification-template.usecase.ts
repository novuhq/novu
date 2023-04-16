import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import * as shortid from 'shortid';

import { NotificationTemplateRepository } from '@novu/dal';
import { ChangeEntityTypeEnum, INotificationTemplateStep, INotificationTrigger, TriggerTypeEnum } from '@novu/shared';
import { AnalyticsService } from '@novu/application-generic';

import { CreateNotificationTemplateCommand } from './create-notification-template.command';
import { ContentService } from '../../../shared/helpers/content.service';
import { CreateMessageTemplate } from '../../../message-template/usecases/create-message-template/create-message-template.usecase';
import { CreateMessageTemplateCommand } from '../../../message-template/usecases/create-message-template/create-message-template.command';
import { CreateChange, CreateChangeCommand } from '../../../change/usecases';

import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class CreateNotificationTemplate {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createMessageTemplate: CreateMessageTemplate,
    private createChange: CreateChange,
    private analyticsService: AnalyticsService
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
          name: i.name,
          type: i.type,
        };
      }),
      subscriberVariables: subscriberVariables.map((i) => {
        return {
          name: i,
        };
      }),
    };

    const parentChangeId: string = NotificationTemplateRepository.createObjectId();
    const templateSteps: INotificationTemplateStep[] = [];
    let parentStepId: string | null = null;

    for (const message of command.steps) {
      if (!message.template) throw new ApiException(`Unexpected error: message template is missing`);

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
          title: message.template.title,
          feedId: message.template.feedId,
          layoutId: message.template.layoutId,
          preheader: message.template.preheader,
          senderName: message.template.senderName,
          parentChangeId,
          actor: message.template.actor,
        })
      );

      const stepId = template._id;
      templateSteps.push({
        _id: stepId,
        _templateId: template._id,
        filters: message.filters,
        _parentId: parentStepId,
        metadata: message.metadata,
        active: message.active,
        shouldStopOnFail: message.shouldStopOnFail,
        replyCallback: message.replyCallback,
        uuid: message.uuid,
        name: message.name,
      });

      if (stepId) {
        parentStepId = stepId;
      }
    }

    const savedTemplate = await this.notificationTemplateRepository.create({
      _organizationId: command.organizationId,
      _creatorId: command.userId,
      _environmentId: command.environmentId,
      name: command.name,
      active: command.active,
      draft: command.draft,
      critical: command.critical,
      preferenceSettings: command.preferenceSettings,
      tags: command.tags,
      description: command.description,
      steps: templateSteps,
      triggers: [trigger],
      _notificationGroupId: command.notificationGroupId,
      blueprintId: command.blueprintId,
    });

    const item = await this.notificationTemplateRepository.findById(savedTemplate._id, command.environmentId);
    if (!item) throw new NotFoundException(`Notification template ${savedTemplate._id} is not found`);

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

    if (command.name !== 'On-boarding notification') {
      this.analyticsService.track('Create Notification Template - [Platform]', command.userId, {
        _organization: command.organizationId,
        steps: command.steps?.length,
        channels: command.steps?.map((i) => i.template?.type),
      });
    }

    return item;
  }
}
