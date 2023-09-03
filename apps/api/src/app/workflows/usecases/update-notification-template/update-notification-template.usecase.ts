// eslint-ignore max-len
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ChangeRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  NotificationGroupRepository,
} from '@novu/dal';
import { ChangeEntityTypeEnum, INotificationTemplateStep } from '@novu/shared';
import {
  AnalyticsService,
  InvalidateCacheService,
  CacheService,
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
} from '@novu/application-generic';

import { UpdateNotificationTemplateCommand } from './update-notification-template.command';
import { ContentService } from '../../../shared/helpers/content.service';
import {
  CreateMessageTemplate,
  CreateMessageTemplateCommand,
  UpdateMessageTemplateCommand,
  UpdateMessageTemplate,
} from '../../../message-template/usecases';
import { CreateChange, CreateChangeCommand } from '../../../change/usecases';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { NotificationStep } from '../create-notification-template';
import { DeleteMessageTemplate } from '../../../message-template/usecases/delete-message-template/delete-message-template.usecase';
import { DeleteMessageTemplateCommand } from '../../../message-template/usecases/delete-message-template/delete-message-template.command';

/**
 * DEPRECATED:
 * This usecase is deprecated and will be removed in the future.
 * Please use the UpdateWorkflow usecase instead.
 */
@Injectable()
export class UpdateNotificationTemplate {
  constructor(
    private cacheService: CacheService,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createMessageTemplate: CreateMessageTemplate,
    private updateMessageTemplate: UpdateMessageTemplate,
    private createChange: CreateChange,
    private changeRepository: ChangeRepository,
    private analyticsService: AnalyticsService,
    private invalidateCache: InvalidateCacheService,
    private notificationGroupRepository: NotificationGroupRepository,
    private deleteMessageTemplate: DeleteMessageTemplate
  ) {}

  async execute(command: UpdateNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    const existingTemplate = await this.notificationTemplateRepository.findById(command.id, command.environmentId);
    if (!existingTemplate) throw new NotFoundException(`Notification template with id ${command.id} not found`);

    const updatePayload: Partial<NotificationTemplateEntity> = {};
    if (command.name) {
      updatePayload.name = command.name;
    }

    if (command.description) {
      updatePayload.description = command.description;
    }

    if (command.identifier) {
      const isExistingIdentifier = await this.notificationTemplateRepository.findByTriggerIdentifier(
        command.environmentId,
        command.identifier
      );

      if (isExistingIdentifier && isExistingIdentifier._id !== command.id) {
        throw new BadRequestException(`Notification template with identifier ${command.identifier} already exists`);
      } else {
        updatePayload['triggers.0.identifier'] = command.identifier;
      }
    }

    if (command.notificationGroupId) {
      const notificationGroup = this.notificationGroupRepository.findOne({
        _id: command.notificationGroupId,
        _environmentId: command.environmentId,
      });

      if (!notificationGroup)
        throw new NotFoundException(
          `Notification group with id ${command.notificationGroupId} not found, under environment ${command.environmentId}`
        );

      updatePayload._notificationGroupId = command.notificationGroupId;
    }

    if (command.critical != null) {
      updatePayload.critical = command.critical;

      if (command.critical !== existingTemplate.critical) {
        this.analyticsService.track('Update Critical Template - [Platform]', command.userId, {
          _organization: command.organizationId,
          critical: command.critical,
        });
      }
    }

    if (command.preferenceSettings) {
      if (existingTemplate.preferenceSettings) {
        if (JSON.stringify(existingTemplate.preferenceSettings) !== JSON.stringify(command.preferenceSettings)) {
          this.analyticsService.track('Update Preference Defaults - [Platform]', command.userId, {
            _organization: command.organizationId,
            critical: command.critical,
            ...command.preferenceSettings,
          });
        }
      }

      updatePayload.preferenceSettings = command.preferenceSettings;
    }

    const parentChangeId: string = await this.changeRepository.getChangeId(
      command.environmentId,
      ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
      existingTemplate._id
    );

    if (command.steps) {
      const contentService = new ContentService();
      const { steps } = command;

      const { variables, reservedVariables } = contentService.extractMessageVariables(command.steps);
      updatePayload['triggers.0.variables'] = variables.map((i) => {
        return {
          name: i.name,
          type: i.type,
        };
      });

      updatePayload['triggers.0.reservedVariables'] = reservedVariables.map((i) => {
        return {
          type: i.type,
          variables: i.variables.map((variable) => {
            return {
              name: variable.name,
              type: variable.type,
            };
          }),
        };
      });

      const subscribersVariables = contentService.extractSubscriberMessageVariables(command.steps);

      updatePayload['triggers.0.subscriberVariables'] = subscribersVariables.map((i) => {
        return {
          name: i,
        };
      });

      const templateMessages: NotificationStepEntity[] = [];
      let parentStepId: string | null = null;

      for (const message of steps) {
        let stepId = message._id;
        if (message._templateId) {
          if (!message.template) throw new ApiException(`Something un-expected happened, template couldn't be found`);

          const template = await this.updateMessageTemplate.execute(
            UpdateMessageTemplateCommand.create({
              templateId: message._templateId,
              type: message.template.type,
              name: message.template.name,
              content: message.template.content,
              variables: message.template.variables,
              organizationId: command.organizationId,
              environmentId: command.environmentId,
              userId: command.userId,
              contentType: message.template.contentType,
              cta: message.template.cta,
              feedId: message.template.feedId ? message.template.feedId : null,
              layoutId: message.template.layoutId || null,
              subject: message.template.subject,
              title: message.template.title,
              preheader: message.template.preheader,
              senderName: message.template.senderName,
              actor: message.template.actor,
              parentChangeId,
            })
          );
          stepId = template._id;
        } else {
          if (!message.template) throw new ApiException("Something un-expected happened, template couldn't be found");

          const template = await this.createMessageTemplate.execute(
            CreateMessageTemplateCommand.create({
              type: message.template.type,
              name: message.template.name,
              content: message.template.content,
              variables: message.template.variables,
              organizationId: command.organizationId,
              environmentId: command.environmentId,
              contentType: message.template.contentType,
              userId: command.userId,
              cta: message.template.cta,
              feedId: message.template.feedId,
              layoutId: message.template.layoutId,
              subject: message.template.subject,
              title: message.template.title,
              preheader: message.template.preheader,
              senderName: message.template.senderName,
              actor: message.template.actor,
              parentChangeId,
            })
          );

          stepId = template._id;
        }

        const partialNotificationStep = this.getPartialTemplateStep(stepId, parentStepId, message);

        templateMessages.push(partialNotificationStep as NotificationStepEntity);

        parentStepId = stepId || null;
      }
      updatePayload.steps = templateMessages;

      await this.deleteRemovedSteps(existingTemplate.steps, command, parentChangeId);
    }

    if (command.tags) {
      updatePayload.tags = command.tags;
    }

    if (command.data) {
      updatePayload.data = command.data;
    }

    if (!Object.keys(updatePayload).length) {
      throw new BadRequestException('No properties found for update');
    }

    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateKey({
        _id: existingTemplate._id,
        _environmentId: command.environmentId,
      }),
    });

    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateIdentifierKey({
        templateIdentifier: existingTemplate.triggers[0].identifier,
        _environmentId: command.environmentId,
      }),
    });

    await this.notificationTemplateRepository.update(
      {
        _id: command.id,
        _environmentId: command.environmentId,
      },
      {
        $set: updatePayload,
      }
    );

    const notificationTemplateWithStepTemplate = await this.notificationTemplateRepository.findById(
      command.id,
      command.environmentId
    );
    if (!notificationTemplateWithStepTemplate) {
      throw new NotFoundException(`Notification template ${command.id} is not found`);
    }

    const notificationTemplate = this.cleanNotificationTemplate(notificationTemplateWithStepTemplate);

    await this.createChange.execute(
      CreateChangeCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
        item: notificationTemplate,
        changeId: parentChangeId,
      })
    );

    this.analyticsService.track('Update Notification Template - [Platform]', command.userId, {
      _organization: command.organizationId,
      steps: command.steps?.length,
      channels: command.steps?.map((i) => i.template?.type),
      critical: command.critical,
    });

    return notificationTemplateWithStepTemplate;
  }

  private getPartialTemplateStep(stepId: string | undefined, parentStepId: string | null, message: NotificationStep) {
    const partialNotificationStep: Partial<NotificationStepEntity> = {
      _id: stepId,
      _templateId: stepId,
      _parentId: parentStepId,
    };

    if (message.filters != null) {
      partialNotificationStep.filters = message.filters;
    }

    if (message.active != null) {
      partialNotificationStep.active = message.active;
    }

    if (message.metadata != null) {
      partialNotificationStep.metadata = message.metadata;
    }

    if (message.shouldStopOnFail != null) {
      partialNotificationStep.shouldStopOnFail = message.shouldStopOnFail;
    }

    if (message.replyCallback != null) {
      partialNotificationStep.replyCallback = message.replyCallback;
    }

    if (message.uuid) {
      partialNotificationStep.uuid = message.uuid;
    }

    if (message.name) {
      partialNotificationStep.name = message.name;
    }

    return partialNotificationStep;
  }

  private cleanNotificationTemplate(notificationTemplateWithStepTemplate: NotificationTemplateEntity) {
    const notificationTemplate = Object.assign({}, notificationTemplateWithStepTemplate);

    notificationTemplate.steps = notificationTemplateWithStepTemplate.steps.map((step) => {
      const { template, ...rest } = step;

      return rest;
    });

    return notificationTemplate;
  }

  private getRemovedSteps(existingSteps: NotificationStepEntity[], newSteps: INotificationTemplateStep[]) {
    const existingStepsIds = existingSteps.map((i) => i._templateId);
    const newStepsIds = newSteps.map((i) => i._templateId);

    const removedStepsIds = existingStepsIds.filter((id) => !newStepsIds.includes(id));

    return removedStepsIds;
  }

  private async deleteRemovedSteps(
    existingSteps: NotificationStepEntity[],
    command: UpdateNotificationTemplateCommand,
    parentChangeId: string
  ) {
    const removedStepsIds = this.getRemovedSteps(existingSteps || [], command.steps || []);

    for (const id of removedStepsIds) {
      await this.deleteMessageTemplate.execute(
        DeleteMessageTemplateCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          messageTemplateId: id,
          parentChangeId: parentChangeId,
        })
      );
    }
  }
}
