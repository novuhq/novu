// eslint-ignore max-len
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ChangeRepository,
  NotificationGroupRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  StepVariantEntity,
} from '@novu/dal';
import { ChangeEntityTypeEnum, StepTypeEnum } from '@novu/shared';
import {
  AnalyticsService,
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
  CreateChange,
  CreateChangeCommand,
  CacheService,
  InvalidateCacheService,
  PlatformException,
} from '@novu/application-generic';

import { UpdateNotificationTemplateCommand } from './update-notification-template.command';
import { ContentService } from '../../../shared/helpers/content.service';
import {
  CreateMessageTemplate,
  CreateMessageTemplateCommand,
  UpdateMessageTemplate,
  UpdateMessageTemplateCommand,
} from '../../../message-template/usecases';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { NotificationStep, NotificationStepVariant } from '../create-notification-template';
import { DeleteMessageTemplate } from '../../../message-template/usecases/delete-message-template/delete-message-template.usecase';
import { DeleteMessageTemplateCommand } from '../../../message-template/usecases/delete-message-template/delete-message-template.command';
import { ModuleRef } from '@nestjs/core';
import { checkIsVariantEmpty } from '../../utils';

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
    private deleteMessageTemplate: DeleteMessageTemplate,
    protected moduleRef: ModuleRef
  ) {}

  async execute(command: UpdateNotificationTemplateCommand): Promise<NotificationTemplateEntity> {
    this.validatePayload(command);

    const existingTemplate = await this.notificationTemplateRepository.findById(command.id, command.environmentId);
    if (!existingTemplate) throw new NotFoundException(`Notification template with id ${command.id} not found`);

    let updatePayload: Partial<NotificationTemplateEntity> = {};
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
      updatePayload = this.updateTriggers(updatePayload, command.steps);

      updatePayload.steps = await this.updateMessageTemplates(command.steps, command, parentChangeId);

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

    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!require('@novu/ee-translation')?.TranslationsService) {
          throw new PlatformException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(require('@novu/ee-translation')?.TranslationsService, { strict: false });
        await service.createTranslationAnalytics(notificationTemplateWithStepTemplate);
      }
    } catch (e) {
      Logger.error(e, `Unexpected error while importing enterprise modules`, 'TranslationsService');
    }

    return notificationTemplateWithStepTemplate;
  }

  private validatePayload(command: UpdateNotificationTemplateCommand) {
    const variants = command.steps ? command.steps?.flatMap((step) => step.variants || []) : [];

    for (const variant of variants) {
      if (checkIsVariantEmpty(variant)) {
        throw new ApiException(`Variant filters are required, variant name ${variant.name} id ${variant._id}`);
      }
    }
  }

  private async updateMessageTemplates(
    steps: NotificationStep[],
    command: UpdateNotificationTemplateCommand,
    parentChangeId: string
  ) {
    let parentStepId: string | null = null;
    const templateMessages: NotificationStepEntity[] = [];

    for (const message of steps) {
      let stepId = message._id;
      if (!message.template) throw new ApiException(`Something un-expected happened, template couldn't be found`);

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const updatedVariants = await this.updateVariants(message.variants, command, parentChangeId!);

      const messageTemplatePayload: CreateMessageTemplateCommand | UpdateMessageTemplateCommand = {
        type: message.template.type,
        name: message.template.name,
        content: message.template.content,
        variables: message.template.variables,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        contentType: message.template.contentType,
        cta: message.template.cta,
        feedId: message.template.feedId ? message.template.feedId : undefined,
        layoutId: message.template.layoutId || null,
        subject: message.template.subject,
        title: message.template.title,
        preheader: message.template.preheader,
        senderName: message.template.senderName,
        actor: message.template.actor,
        parentChangeId,
      };

      const messageTemplateExist = message._templateId;
      const updatedTemplate = messageTemplateExist
        ? await this.updateMessageTemplate.execute(
            UpdateMessageTemplateCommand.create({
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              templateId: message._templateId!,
              ...messageTemplatePayload,
            })
          )
        : await this.createMessageTemplate.execute(CreateMessageTemplateCommand.create(messageTemplatePayload));

      stepId = updatedTemplate._id;

      const partialNotificationStep = this.getPartialTemplateStep(stepId, parentStepId, message, updatedVariants);

      templateMessages.push(partialNotificationStep as NotificationStepEntity);

      parentStepId = stepId || null;
    }

    return templateMessages;
  }

  private updateTriggers(
    updatePayload: Partial<NotificationTemplateEntity>,
    steps: NotificationStep[]
  ): Partial<NotificationTemplateEntity> {
    const updatePayloadResult: Partial<NotificationTemplateEntity> = { ...updatePayload };

    const contentService = new ContentService();
    const { variables, reservedVariables } = contentService.extractMessageVariables(steps);

    updatePayloadResult['triggers.0.variables'] = variables.map((i) => {
      return {
        name: i.name,
        type: i.type,
      };
    });

    updatePayloadResult['triggers.0.reservedVariables'] = reservedVariables.map((i) => {
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

    const subscribersVariables = contentService.extractSubscriberMessageVariables(steps);

    updatePayloadResult['triggers.0.subscriberVariables'] = subscribersVariables.map((i) => {
      return {
        name: i,
      };
    });

    return updatePayloadResult;
  }

  private getPartialTemplateStep(
    stepId: string | undefined,
    parentStepId: string | null,
    message: NotificationStep,
    updatedVariants: StepVariantEntity[]
  ) {
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

    if (updatedVariants.length) {
      partialNotificationStep.variants = updatedVariants;
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

  private getRemovedSteps(existingSteps: NotificationStepEntity[], newSteps: NotificationStep[]) {
    const existingStepsIds = (existingSteps || []).flatMap((step) => [
      step._templateId,
      ...(step.variants || []).flatMap((variant) => variant._templateId),
    ]);

    const newStepsIds = (newSteps || []).flatMap((step) => [
      step._templateId,
      ...(step.variants || []).flatMap((variant) => variant._templateId),
    ]);

    const removedStepsIds = existingStepsIds.filter((id) => !newStepsIds.includes(id));

    return removedStepsIds;
  }

  private async updateVariants(
    variants: NotificationStepVariant[] | undefined,
    command: UpdateNotificationTemplateCommand,
    parentChangeId: string
  ): Promise<StepVariantEntity[]> {
    if (!variants?.length) return [];

    const variantsList: StepVariantEntity[] = [];
    let parentVariantId: string | null = null;

    for (const variant of variants) {
      if (!variant.template) throw new ApiException(`Unexpected error: variants message template is missing`);

      const messageTemplatePayload: CreateMessageTemplateCommand | UpdateMessageTemplateCommand = {
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        type: variant.template.type,
        name: variant.template.name,
        content: variant.template.content,
        variables: variant.template.variables,
        contentType: variant.template.contentType,
        cta: variant.template.cta,
        subject: variant.template.subject,
        title: variant.template.title,
        feedId: variant.template.feedId ? variant.template.feedId : undefined,
        layoutId: variant.template.layoutId || null,
        preheader: variant.template.preheader,
        senderName: variant.template.senderName,
        actor: variant.template.actor,
        parentChangeId,
      };

      const messageTemplateExist = variant._templateId;
      const updatedVariant = messageTemplateExist
        ? await this.updateMessageTemplate.execute(
            UpdateMessageTemplateCommand.create({
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              templateId: variant._templateId!,
              ...messageTemplatePayload,
            })
          )
        : await this.createMessageTemplate.execute(CreateMessageTemplateCommand.create(messageTemplatePayload));

      if (!updatedVariant._id) throw new ApiException(`Unexpected error: variants message template was not created`);

      variantsList.push({
        _id: updatedVariant._id,
        _templateId: updatedVariant._id,
        filters: variant.filters,
        _parentId: parentVariantId,
        active: variant.active,
        shouldStopOnFail: variant.shouldStopOnFail,
        replyCallback: variant.replyCallback,
        uuid: variant.uuid,
        name: variant.name,
        metadata: variant.metadata,
      });

      if (updatedVariant._id) {
        parentVariantId = updatedVariant._id;
      }
    }

    return variantsList;
  }

  private async deleteRemovedSteps(
    existingSteps: NotificationStepEntity[] | StepVariantEntity[] | undefined,
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
