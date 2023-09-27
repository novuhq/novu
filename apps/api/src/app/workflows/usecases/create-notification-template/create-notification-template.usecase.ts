import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import * as shortid from 'shortid';

import {
  NotificationTemplateRepository,
  NotificationGroupEntity,
  NotificationStepEntity,
  FeedRepository,
  NotificationGroupRepository,
} from '@novu/dal';
import { ChangeEntityTypeEnum, INotificationTemplateStep, INotificationTrigger, TriggerTypeEnum } from '@novu/shared';
import { AnalyticsService } from '@novu/application-generic';

import { CreateNotificationTemplateCommand } from './create-notification-template.command';
import { ContentService } from '../../../shared/helpers/content.service';
import { CreateMessageTemplate, CreateMessageTemplateCommand } from '../../../message-template/usecases';
import { CreateChange, CreateChangeCommand } from '../../../change/usecases';
import { ApiException } from '../../../shared/exceptions/api.exception';

/**
 * DEPRECATED:
 * This usecase is deprecated and will be removed in the future.
 * Please use the CreateWorkflow usecase instead.
 */
@Injectable()
export class CreateNotificationTemplate {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createMessageTemplate: CreateMessageTemplate,
    private notificationGroupRepository: NotificationGroupRepository,
    private feedRepository: FeedRepository,
    private createChange: CreateChange,
    private analyticsService: AnalyticsService
  ) {}

  async execute(usecaseCommand: CreateNotificationTemplateCommand) {
    const blueprintCommand = await this.processBlueprint(usecaseCommand);
    const command = blueprintCommand ?? usecaseCommand;

    const contentService = new ContentService();
    const { variables, reservedVariables } = contentService.extractMessageVariables(command.steps);
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
      reservedVariables: reservedVariables.map((i) => {
        return {
          type: i.type,
          variables: i.variables.map((variable) => {
            return {
              name: variable.name,
              type: variable.type,
            };
          }),
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
          variables: message.template.variables,
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
      ...(command.data ? { data: command.data } : {}),
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

    if (command.name !== 'On-boarding notification' && !command.__source?.startsWith('onboarding_')) {
      this.analyticsService.track('Create Notification Template - [Platform]', command.userId, {
        _organization: command.organizationId,
        steps: command.steps?.length,
        channels: command.steps?.map((i) => i.template?.type),
        __source: command.__source,
        triggerIdentifier,
      });
    }

    return item;
  }

  private async processBlueprint(command: CreateNotificationTemplateCommand) {
    if (!command.blueprintId) return null;

    const group: NotificationGroupEntity = await this.handleGroup(command.notificationGroupId, command);
    const steps: NotificationStepEntity[] = await this.handleFeeds(command.steps as any, command);

    return CreateNotificationTemplateCommand.create({
      organizationId: command.organizationId,
      userId: command.userId,
      environmentId: command.environmentId,
      name: command.name,
      tags: command.tags,
      description: command.description,
      steps: steps,
      notificationGroupId: group._id,
      active: command.active ?? false,
      draft: command.draft ?? true,
      critical: command.critical ?? false,
      preferenceSettings: command.preferenceSettings,
      blueprintId: command.blueprintId,
      __source: command.__source,
    });
  }

  private async handleFeeds(
    steps: NotificationStepEntity[],
    command: CreateNotificationTemplateCommand
  ): Promise<NotificationStepEntity[]> {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (!step.template?._feedId) {
        continue;
      }

      const blueprintFeed = await this.feedRepository.findOne({
        _organizationId: this.getBlueprintOrganizationId,
        _id: step.template._feedId,
      });

      if (!blueprintFeed) {
        step.template._feedId = undefined;
        steps[i] = step;
        continue;
      }

      let foundFeed = await this.feedRepository.findOne({
        _organizationId: command.organizationId,
        identifier: blueprintFeed.identifier,
      });

      if (!foundFeed) {
        foundFeed = await this.feedRepository.create({
          name: blueprintFeed.name,
          identifier: blueprintFeed.identifier,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        });
      }

      step.template._feedId = foundFeed._id;
      steps[i] = step;
    }

    return steps;
  }

  private async handleGroup(
    notificationGroupId: string,
    command: CreateNotificationTemplateCommand
  ): Promise<NotificationGroupEntity> {
    const blueprintNotificationGroup = await this.notificationGroupRepository.findOne({
      _id: notificationGroupId,
      _organizationId: this.getBlueprintOrganizationId,
    });

    if (!blueprintNotificationGroup)
      throw new NotFoundException(`Blueprint workflow group with id ${notificationGroupId} is not found`);

    let group = await this.notificationGroupRepository.findOne({
      name: blueprintNotificationGroup.name,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!group) {
      group = await this.notificationGroupRepository.create({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        name: blueprintNotificationGroup.name,
      });
    }

    return group;
  }
  private get getBlueprintOrganizationId(): string {
    return NotificationTemplateRepository.getBlueprintOrganizationId() as string;
  }
}
