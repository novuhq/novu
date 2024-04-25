// eslint-ignore max-len
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import {
  ChangeRepository,
  MessageTemplateRepository,
  NotificationGroupRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  StepVariantEntity,
} from '@novu/dal';
import { ChangeEntityTypeEnum, WorkflowTypeEnum } from '@novu/shared';

import {
  AnalyticsService,
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
  ContentService,
  InvalidateCacheService,
} from '../../../services';
import { UpdateWorkflowCommand } from './update-workflow.command';
import { isVariantEmpty } from '../../../utils/variants';
import { ApiException, PlatformException } from '../../../utils/exceptions';
import {
  CreateChange,
  CreateChangeCommand,
  CreateMessageTemplate,
  CreateMessageTemplateCommand,
  NotificationStep,
  NotificationStepVariantCommand,
} from '../../../usecases';
import {
  DeleteMessageTemplate,
  DeleteMessageTemplateCommand,
  UpdateMessageTemplate,
  UpdateMessageTemplateCommand,
} from '../../message-template';

@Injectable()
export class UpdateWorkflow {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private changeRepository: ChangeRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    @Inject(forwardRef(() => CreateMessageTemplate))
    private createMessageTemplate: CreateMessageTemplate,
    @Inject(forwardRef(() => UpdateMessageTemplate))
    private updateMessageTemplate: UpdateMessageTemplate,
    private deleteMessageTemplate: DeleteMessageTemplate,
    private createChange: CreateChange,
    @Inject(forwardRef(() => InvalidateCacheService))
    private invalidateCache: InvalidateCacheService,
    @Inject(forwardRef(() => AnalyticsService))
    private analyticsService: AnalyticsService,
    protected moduleRef: ModuleRef
  ) {}

  async execute(
    command: UpdateWorkflowCommand
  ): Promise<NotificationTemplateEntity> {
    this.validatePayload(command);

    const existingTemplate = await this.notificationTemplateRepository.findById(
      command.id,
      command.environmentId
    );
    if (!existingTemplate)
      throw new NotFoundException(
        `Notification template with id ${command.id} not found`
      );

    let updatePayload: Partial<NotificationTemplateEntity> = {};
    if (command.name) {
      updatePayload.name = command.name;
    }

    if (command.active) {
      updatePayload.active = command.active;
    }

    if (command.description) {
      updatePayload.description = command.description;
    }

    if (command.identifier) {
      const isExistingIdentifier =
        await this.notificationTemplateRepository.findByTriggerIdentifier(
          command.environmentId,
          command.identifier
        );

      if (isExistingIdentifier && isExistingIdentifier._id !== command.id) {
        throw new BadRequestException(
          `Notification template with identifier ${command.identifier} already exists`
        );
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
        this.analyticsService.track(
          'Update Critical Template - [Platform]',
          command.userId,
          {
            _organization: command.organizationId,
            critical: command.critical,
          }
        );
      }
    }

    if (command.preferenceSettings) {
      if (existingTemplate.preferenceSettings) {
        if (
          JSON.stringify(existingTemplate.preferenceSettings) !==
          JSON.stringify(command.preferenceSettings)
        ) {
          this.analyticsService.track(
            'Update Preference Defaults - [Platform]',
            command.userId,
            {
              _organization: command.organizationId,
              critical: command.critical,
              ...command.preferenceSettings,
            }
          );
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

      updatePayload.steps = await this.updateMessageTemplates(
        command.steps,
        command,
        parentChangeId
      );

      await this.deleteRemovedSteps(
        existingTemplate.steps,
        command,
        parentChangeId
      );
    }

    if (command.tags) {
      updatePayload.tags = command.tags;
    }

    if (command.data) {
      updatePayload.data = command.data;
    }

    /*
     * if (command.inputs) {
     *   updatePayload.inputs = command.inputs;
     * }
     */

    if (command.rawData) {
      updatePayload.rawData = command.rawData;
    }

    if (command.payloadSchema) {
      updatePayload.payloadSchema = command.payloadSchema;
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

    const notificationTemplateWithStepTemplate =
      await this.notificationTemplateRepository.findById(
        command.id,
        command.environmentId
      );
    if (!notificationTemplateWithStepTemplate) {
      throw new NotFoundException(
        `Notification template ${command.id} is not found`
      );
    }

    const notificationTemplate = this.cleanNotificationTemplate(
      notificationTemplateWithStepTemplate
    );

    if (command.type !== WorkflowTypeEnum.ECHO) {
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
    }

    this.analyticsService.track(
      'Update Notification Template - [Platform]',
      command.userId,
      {
        _organization: command.organizationId,
        steps: command.steps?.length,
        channels: command.steps?.map((i) => i.template?.type),
        critical: command.critical,
      }
    );

    try {
      if (
        process.env.NOVU_ENTERPRISE === 'true' ||
        process.env.CI_EE_TEST === 'true'
      ) {
        if (!require('@novu/ee-shared-services')?.TranslationsService) {
          throw new PlatformException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(
          require('@novu/ee-shared-services')?.TranslationsService,
          { strict: false }
        );
        const locales = await service.createTranslationAnalytics(
          notificationTemplateWithStepTemplate
        );

        this.analyticsService.track(
          'Locale used in workflow - [Translations]',
          command.userId,
          {
            _organization: command.organizationId,
            _environment: command.environmentId,
            workflowId: command.id,
            locales,
          }
        );
      }
    } catch (e) {
      Logger.error(
        e,
        `Unexpected error while importing enterprise modules`,
        'TranslationsService'
      );
    }

    return notificationTemplateWithStepTemplate;
  }

  private validatePayload(command: UpdateWorkflowCommand) {
    const variants = command.steps
      ? command.steps?.flatMap((step) => step.variants || [])
      : [];

    for (const variant of variants) {
      if (isVariantEmpty(variant)) {
        throw new ApiException(
          `Variant filters are required, variant name ${variant.name} id ${variant._id}`
        );
      }
    }
  }

  private async updateMessageTemplates(
    steps: NotificationStep[],
    command: UpdateWorkflowCommand,
    parentChangeId: string
  ) {
    let parentStepId: string | null = null;
    const templateMessages: NotificationStepEntity[] = [];

    for (const message of steps) {
      let messageTemplateId = message._id;

      if (!message.template) {
        throw new ApiException(
          `Something un-expected happened, template couldn't be found`
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const updatedVariants = await this.updateVariants(
        message.variants,
        command,
        parentChangeId!
      );

      const messageTemplatePayload:
        | CreateMessageTemplateCommand
        | UpdateMessageTemplateCommand = {
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
        inputs: message?.template.inputs,
        output: message?.template.output,
        workflowType: command.type,
      };

      let messageTemplateExist = message._templateId;

      if (!messageTemplateExist && command.type === WorkflowTypeEnum.ECHO) {
        const stepMessageTemplate =
          await this.messageTemplateRepository.findOne({
            _environmentId: command.environmentId,
            stepId: message.stepId,
            _parentId: command.id,
          });
        messageTemplateExist = stepMessageTemplate?._id;
      }

      const updatedTemplate = messageTemplateExist
        ? await this.updateMessageTemplate.execute(
            UpdateMessageTemplateCommand.create({
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              templateId: message._templateId!,
              ...messageTemplatePayload,
            })
          )
        : await this.createMessageTemplate.execute(
            CreateMessageTemplateCommand.create(messageTemplatePayload)
          );

      messageTemplateId = updatedTemplate._id;

      const partialNotificationStep = this.getPartialTemplateStep(
        messageTemplateId,
        parentStepId,
        message,
        updatedVariants
      );

      templateMessages.push(partialNotificationStep as NotificationStepEntity);

      parentStepId = messageTemplateId || null;
    }

    return templateMessages;
  }

  private updateTriggers(
    updatePayload: Partial<NotificationTemplateEntity>,
    steps: NotificationStep[]
  ): Partial<NotificationTemplateEntity> {
    const updatePayloadResult: Partial<NotificationTemplateEntity> = {
      ...updatePayload,
    };

    const contentService = new ContentService();
    const { variables, reservedVariables } =
      contentService.extractMessageVariables(steps);

    updatePayloadResult['triggers.0.variables'] = variables.map((i) => {
      return {
        name: i.name,
        type: i.type,
      };
    });

    updatePayloadResult['triggers.0.reservedVariables'] = reservedVariables.map(
      (i) => {
        return {
          type: i.type,
          variables: i.variables.map((variable) => {
            return {
              name: variable.name,
              type: variable.type,
            };
          }),
        };
      }
    );

    const subscribersVariables =
      contentService.extractSubscriberMessageVariables(steps);

    updatePayloadResult['triggers.0.subscriberVariables'] =
      subscribersVariables.map((i) => {
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

    if (message.stepId) {
      partialNotificationStep.stepId = message.stepId;
    }

    if (updatedVariants.length) {
      partialNotificationStep.variants = updatedVariants;
    }

    return partialNotificationStep;
  }

  private cleanNotificationTemplate(
    notificationTemplateWithStepTemplate: NotificationTemplateEntity
  ) {
    const notificationTemplate = Object.assign(
      {},
      notificationTemplateWithStepTemplate
    );

    notificationTemplate.steps = notificationTemplateWithStepTemplate.steps.map(
      (step) => {
        const { template, ...rest } = step;

        return rest;
      }
    );

    return notificationTemplate;
  }

  private getRemovedSteps(
    existingSteps: NotificationStepEntity[],
    newSteps: NotificationStep[]
  ) {
    const existingStepsIds = (existingSteps || []).flatMap((step) => [
      step._templateId,
      ...(step.variants || []).flatMap((variant) => variant._templateId),
    ]);

    const newStepsIds = (newSteps || []).flatMap((step) => [
      step._templateId,
      ...(step.variants || []).flatMap((variant) => variant._templateId),
    ]);

    const removedStepsIds = existingStepsIds.filter(
      (id) => !newStepsIds.includes(id)
    );

    return removedStepsIds;
  }

  private async updateVariants(
    variants: NotificationStepVariantCommand[] | undefined,
    command: UpdateWorkflowCommand,
    parentChangeId: string
  ): Promise<StepVariantEntity[]> {
    if (!variants?.length) return [];

    const variantsList: StepVariantEntity[] = [];
    let parentVariantId: string | null = null;

    for (const variant of variants) {
      if (!variant.template)
        throw new ApiException(
          `Unexpected error: variants message template is missing`
        );

      const messageTemplatePayload:
        | CreateMessageTemplateCommand
        | UpdateMessageTemplateCommand = {
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
        workflowType: command.type,
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
        : await this.createMessageTemplate.execute(
            CreateMessageTemplateCommand.create(messageTemplatePayload)
          );

      if (!updatedVariant._id)
        throw new ApiException(
          `Unexpected error: variants message template was not created`
        );

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
    command: UpdateWorkflowCommand,
    parentChangeId: string
  ) {
    const removedStepsIds = this.getRemovedSteps(
      existingSteps || [],
      command.steps || []
    );

    for (const id of removedStepsIds) {
      await this.deleteMessageTemplate.execute(
        DeleteMessageTemplateCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          messageTemplateId: id,
          parentChangeId: parentChangeId,
          workflowType: command.type,
        })
      );
    }
  }
}
