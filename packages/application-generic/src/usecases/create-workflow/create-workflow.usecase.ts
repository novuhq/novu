import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import slugify from 'slugify';
import * as shortid from 'shortid';

import {
  FeedRepository,
  NotificationGroupEntity,
  NotificationGroupRepository,
  NotificationStepEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  ChangeEntityTypeEnum,
  INotificationTemplateStep,
  INotificationTrigger,
  IStepVariant,
  TriggerTypeEnum,
  WorkflowTypeEnum,
} from '@novu/shared';

import {
  CreateWorkflowCommand,
  NotificationStep,
  NotificationStepVariantCommand,
} from './create-workflow.command';
import { CreateChange, CreateChangeCommand } from '../create-change';
import { AnalyticsService } from '../../services';
import { ContentService } from '../../services/content.service';
import { isVariantEmpty } from '../../utils/variants';
import {
  CreateMessageTemplate,
  CreateMessageTemplateCommand,
} from '../message-template';
import { ApiException, PlatformException } from '../../utils/exceptions';

@Injectable()
export class CreateWorkflow {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createMessageTemplate: CreateMessageTemplate,
    private notificationGroupRepository: NotificationGroupRepository,
    private feedRepository: FeedRepository,
    private createChange: CreateChange,
    @Inject(forwardRef(() => AnalyticsService))
    private analyticsService: AnalyticsService,
    protected moduleRef: ModuleRef
  ) {}

  async execute(usecaseCommand: CreateWorkflowCommand) {
    const blueprintCommand = await this.processBlueprint(usecaseCommand);
    const command = blueprintCommand ?? usecaseCommand;

    this.validatePayload(command);

    const triggerIdentifier = `${slugify(command.name, {
      lower: true,
      strict: true,
    })}`;
    const parentChangeId: string =
      NotificationTemplateRepository.createObjectId();

    const [templateSteps, trigger] = await Promise.all([
      this.storeTemplateSteps(command, parentChangeId),
      this.createNotificationTrigger(command, triggerIdentifier),
    ]);

    const storedWorkflow = await this.storeWorkflow(
      command,
      templateSteps,
      trigger,
      triggerIdentifier
    );

    await this.createWorkflowChange(command, storedWorkflow, parentChangeId);

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
          storedWorkflow
        );

        this.analyticsService.track(
          'Locale used in workflow - [Translations]',
          command.userId,
          {
            _organization: command.organizationId,
            _environment: command.environmentId,
            workflowId: storedWorkflow._id,
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

    return storedWorkflow;
  }

  private validatePayload(command: CreateWorkflowCommand) {
    const variants = command.steps
      ? command.steps?.flatMap((step) => step.variants || [])
      : [];

    for (const variant of variants) {
      if (isVariantEmpty(variant)) {
        throw new ApiException(
          `Variant conditions are required, variant name ${variant.name} id ${variant._id}`
        );
      }
    }
  }

  private async createNotificationTrigger(
    command: CreateWorkflowCommand,
    triggerIdentifier: string
  ): Promise<INotificationTrigger> {
    const contentService = new ContentService();
    const { variables, reservedVariables } =
      contentService.extractMessageVariables(command.steps);
    const subscriberVariables =
      contentService.extractSubscriberMessageVariables(command.steps);

    const templateCheckIdentifier =
      await this.notificationTemplateRepository.findByTriggerIdentifier(
        command.environmentId,
        triggerIdentifier
      );

    const trigger: INotificationTrigger = {
      type: TriggerTypeEnum.EVENT,
      identifier: `${triggerIdentifier}${
        !templateCheckIdentifier ? '' : '-' + shortid.generate()
      }`,
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

    return trigger;
  }

  private sendTemplateCreationEvent(
    command: CreateWorkflowCommand,
    triggerIdentifier: string
  ) {
    if (
      command.name !== 'On-boarding notification' &&
      !command.__source?.startsWith('onboarding_')
    ) {
      this.analyticsService.track(
        'Create Notification Template - [Platform]',
        command.userId,
        {
          _organization: command.organizationId,
          steps: command.steps?.length,
          channels: command.steps?.map((i) => i.template?.type),
          __source: command.__source,
          triggerIdentifier,
        }
      );
    }
  }

  private async createWorkflowChange(
    command: CreateWorkflowCommand,
    item,
    parentChangeId: string
  ) {
    if (command.type !== WorkflowTypeEnum.ECHO) {
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
    }
  }

  private async storeWorkflow(
    command: CreateWorkflowCommand,
    templateSteps: INotificationTemplateStep[],
    trigger: INotificationTrigger,
    triggerIdentifier: string
  ) {
    const savedWorkflow = await this.notificationTemplateRepository.create({
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
      type: command.type,
      // ...(command.inputs ? { inputs: command.inputs } : {}),
      ...(command.rawData ? { rawData: command.rawData } : {}),
      ...(command.payloadSchema
        ? { payloadSchema: command.payloadSchema }
        : {}),
      ...(command.data ? { data: command.data } : {}),
    });

    const item = await this.notificationTemplateRepository.findById(
      savedWorkflow._id,
      command.environmentId
    );
    if (!item)
      throw new NotFoundException(`Workflow ${savedWorkflow._id} is not found`);

    this.sendTemplateCreationEvent(command, triggerIdentifier);

    return item;
  }

  private async storeTemplateSteps(
    command: CreateWorkflowCommand,
    parentChangeId: string
  ): Promise<INotificationTemplateStep[]> {
    let parentStepId: string | null = null;
    const templateSteps: INotificationTemplateStep[] = [];

    for (const step of command.steps) {
      if (!step.template)
        throw new ApiException(`Unexpected error: message template is missing`);

      const [createdMessageTemplate, storedVariants] = await Promise.all([
        await this.createMessageTemplate.execute(
          CreateMessageTemplateCommand.create({
            organizationId: command.organizationId,
            environmentId: command.environmentId,
            userId: command.userId,
            type: step.template.type,
            name: step.template.name,
            content: step.template.content,
            variables: step.template.variables,
            contentType: step.template.contentType,
            cta: step.template.cta,
            subject: step.template.subject,
            title: step.template.title,
            feedId: step.template.feedId,
            layoutId: step.template.layoutId,
            preheader: step.template.preheader,
            senderName: step.template.senderName,
            actor: step.template.actor,
            inputs: step.template.inputs,
            output: step.template.output,
            stepId: step.template.stepId,
            parentChangeId,
            workflowType: command.type,
          })
        ),
        await this.storeVariantSteps({
          variants: step.variants,
          parentChangeId: parentChangeId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          workflowType: command.type,
        }),
      ]);

      const stepId = createdMessageTemplate._id;
      const templateStep: Partial<INotificationTemplateStep> = {
        _id: stepId,
        _templateId: createdMessageTemplate._id,
        filters: step.filters,
        _parentId: parentStepId,
        active: step.active,
        shouldStopOnFail: step.shouldStopOnFail,
        replyCallback: step.replyCallback,
        uuid: step.uuid,
        name: step.name,
        metadata: step.metadata,
        stepId: step.stepId,
      };

      if (storedVariants.length) {
        templateStep.variants = storedVariants;
      }

      templateSteps.push(templateStep);

      if (stepId) {
        parentStepId = stepId;
      }
    }

    return templateSteps;
  }

  private async storeVariantSteps({
    variants,
    parentChangeId,
    organizationId,
    environmentId,
    userId,
    workflowType,
  }: {
    variants: NotificationStepVariantCommand[] | undefined;
    parentChangeId: string;
    organizationId: string;
    environmentId: string;
    userId: string;
    workflowType: WorkflowTypeEnum;
  }): Promise<IStepVariant[]> {
    if (!variants?.length) return [];

    const variantsList: IStepVariant[] = [];
    let parentVariantId: string | null = null;

    for (const variant of variants) {
      if (!variant.template)
        throw new ApiException(
          `Unexpected error: variants message template is missing`
        );

      const variantTemplate = await this.createMessageTemplate.execute(
        CreateMessageTemplateCommand.create({
          organizationId: organizationId,
          environmentId: environmentId,
          userId: userId,
          type: variant.template.type,
          name: variant.template.name,
          content: variant.template.content,
          variables: variant.template.variables,
          contentType: variant.template.contentType,
          cta: variant.template.cta,
          subject: variant.template.subject,
          title: variant.template.title,
          feedId: variant.template.feedId,
          layoutId: variant.template.layoutId,
          preheader: variant.template.preheader,
          senderName: variant.template.senderName,
          actor: variant.template.actor,
          parentChangeId,
          workflowType,
        })
      );

      variantsList.push({
        _id: variantTemplate._id,
        _templateId: variantTemplate._id,
        filters: variant.filters,
        _parentId: parentVariantId,
        active: variant.active,
        shouldStopOnFail: variant.shouldStopOnFail,
        replyCallback: variant.replyCallback,
        uuid: variant.uuid,
        name: variant.name,
        metadata: variant.metadata,
      });

      if (variantTemplate._id) {
        parentVariantId = variantTemplate._id;
      }
    }

    return variantsList;
  }

  private async processBlueprint(command: CreateWorkflowCommand) {
    if (!command.blueprintId) return null;

    const group: NotificationGroupEntity = await this.handleGroup(command);
    const steps: NotificationStep[] = this.normalizeSteps(command.steps);

    return CreateWorkflowCommand.create({
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
      type: WorkflowTypeEnum.REGULAR,
    });
  }

  private normalizeSteps(commandSteps: NotificationStep[]): NotificationStep[] {
    const steps = JSON.parse(
      JSON.stringify(commandSteps)
    ) as NotificationStep[];

    return steps.map((step) => {
      const template = step.template;
      if (template) {
        template.feedId = undefined;
      }

      return {
        ...step,
        ...(template ? { template } : {}),
      };
    });
  }

  private async handleFeeds(
    steps: NotificationStepEntity[],
    command: CreateWorkflowCommand
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

      let feedItem = await this.feedRepository.findOne({
        _organizationId: command.organizationId,
        identifier: blueprintFeed.identifier,
      });

      if (!feedItem) {
        feedItem = await this.feedRepository.create({
          name: blueprintFeed.name,
          identifier: blueprintFeed.identifier,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        });

        if (command.type !== WorkflowTypeEnum.ECHO) {
          await this.createChange.execute(
            CreateChangeCommand.create({
              item: feedItem,
              type: ChangeEntityTypeEnum.FEED,
              environmentId: command.environmentId,
              organizationId: command.organizationId,
              userId: command.userId,
              changeId: FeedRepository.createObjectId(),
            })
          );
        }
      }

      step.template._feedId = feedItem._id;
      steps[i] = step;
    }

    return steps;
  }

  private async handleGroup(
    command: CreateWorkflowCommand
  ): Promise<NotificationGroupEntity> {
    if (!command.notificationGroup?.name)
      throw new NotFoundException(`Notification group was not provided`);

    let notificationGroup = await this.notificationGroupRepository.findOne({
      name: command.notificationGroup.name,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!notificationGroup) {
      notificationGroup = await this.notificationGroupRepository.create({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        name: command.notificationGroup.name,
      });

      if (command.type !== WorkflowTypeEnum.ECHO) {
        await this.createChange.execute(
          CreateChangeCommand.create({
            item: notificationGroup,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
            type: ChangeEntityTypeEnum.NOTIFICATION_GROUP,
            changeId: NotificationGroupRepository.createObjectId(),
          })
        );
      }
    }

    return notificationGroup;
  }
  private get getBlueprintOrganizationId(): string {
    return NotificationTemplateRepository.getBlueprintOrganizationId() as string;
  }
}
