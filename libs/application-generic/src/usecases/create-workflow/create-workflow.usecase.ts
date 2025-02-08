/* eslint-disable global-require */
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import {
  NotificationGroupEntity,
  NotificationGroupRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  ChangeEntityTypeEnum,
  INotificationTemplateStep,
  INotificationTrigger,
  isBridgeWorkflow,
  IStepVariant,
  TriggerTypeEnum,
  WorkflowOriginEnum,
  WorkflowTypeEnum,
  slugify,
  DEFAULT_WORKFLOW_PREFERENCES,
} from '@novu/shared';

import { PinoLogger } from 'nestjs-pino';
import {
  CreateWorkflowCommand,
  NotificationStep,
  NotificationStepVariantCommand,
} from './create-workflow.command';
import { CreateChange, CreateChangeCommand } from '../create-change';
import {
  AnalyticsService,
  buildNotificationTemplateIdentifierKey,
  buildNotificationTemplateKey,
  InvalidateCacheService,
} from '../../services';
import { ContentService } from '../../services/content.service';
import { isVariantEmpty } from '../../utils/variants';
import {
  CreateMessageTemplate,
  CreateMessageTemplateCommand,
} from '../message-template';
import { ApiException, PlatformException } from '../../utils/exceptions';
import { shortId } from '../../utils/generate-id';
import {
  UpsertPreferences,
  UpsertUserWorkflowPreferencesCommand,
  UpsertWorkflowPreferencesCommand,
} from '../upsert-preferences';
import { GetPreferences } from '../get-preferences';
import {
  GetWorkflowByIdsCommand,
  WorkflowInternalResponseDto,
  GetWorkflowByIdsUseCase,
} from '../workflow';
import { Instrument, InstrumentUsecase } from '../../instrumentation';

/**
 * @deprecated - use `UpsertWorkflow` instead
 */
@Injectable()
export class CreateWorkflow {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createMessageTemplate: CreateMessageTemplate,
    private notificationGroupRepository: NotificationGroupRepository,
    private createChange: CreateChange,
    @Inject(forwardRef(() => AnalyticsService))
    private analyticsService: AnalyticsService,
    private logger: PinoLogger,
    @Inject(forwardRef(() => InvalidateCacheService))
    private invalidateCache: InvalidateCacheService,
    protected moduleRef: ModuleRef,
    @Inject(forwardRef(() => UpsertPreferences))
    private upsertPreferences: UpsertPreferences,
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
  ) {}

  @InstrumentUsecase()
  async execute(
    usecaseCommand: CreateWorkflowCommand,
  ): Promise<WorkflowInternalResponseDto> {
    const blueprintCommand = await this.processBlueprint(usecaseCommand);
    const command = blueprintCommand ?? usecaseCommand;
    this.validatePayload(command);
    let storedWorkflow: WorkflowInternalResponseDto;
    await this.notificationTemplateRepository.withTransaction(async () => {
      const triggerIdentifier = this.generateTriggerIdentifier(command);

      const parentChangeId: string =
        NotificationTemplateRepository.createObjectId();

      const templateSteps = await this.storeTemplateSteps(
        command,
        parentChangeId,
      );
      const trigger = await this.createNotificationTrigger(
        command,
        triggerIdentifier,
      );

      storedWorkflow = await this.storeWorkflow(
        command,
        templateSteps,
        trigger,
        triggerIdentifier,
      );

      await this.createWorkflowChange(command, storedWorkflow, parentChangeId);
    });

    try {
      if (
        (process.env.NOVU_ENTERPRISE === 'true' ||
          process.env.CI_EE_TEST === 'true') &&
        storedWorkflow.origin === WorkflowOriginEnum.NOVU_CLOUD_V1
      ) {
        if (!require('@novu/ee-shared-services')?.TranslationsService) {
          throw new PlatformException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(
          require('@novu/ee-shared-services')?.TranslationsService,
          { strict: false },
        );

        const locales =
          await service.createTranslationAnalytics(storedWorkflow);

        this.analyticsService.track(
          'Locale used in workflow - [Translations]',
          command.userId,
          {
            _organization: command.organizationId,
            _environment: command.environmentId,
            workflowId: storedWorkflow._id,
            locales,
          },
        );
      }
    } catch (e) {
      Logger.error(
        e,
        `Unexpected error while importing enterprise modules`,
        'TranslationsService',
      );
    }

    this.analyticsService.track('Workflow created', command.userId, {
      _organization: command.organizationId,
      _environment: command.environmentId,
      workflowId: storedWorkflow._id,
      name: storedWorkflow.name,
      description: storedWorkflow.description,
      tags: storedWorkflow.tags,
    });

    return storedWorkflow;
  }

  private generateTriggerIdentifier(command: CreateWorkflowCommand) {
    if (command.triggerIdentifier) {
      return command.triggerIdentifier;
    }

    let triggerIdentifier: string;
    if (
      command.type === WorkflowTypeEnum.BRIDGE &&
      command.origin === WorkflowOriginEnum.EXTERNAL
    )
      /*
       * Bridge workflows need to have the identifier preserved to ensure that
       * the Framework-defined identifier is the source of truth.
       */
      triggerIdentifier = command.name;
    else {
      /**
       * For non-bridge workflows, we use a slugified version of the workflow name
       * as the trigger identifier to provide a better trigger DX.
       */
      triggerIdentifier = slugify(command.name);
    }

    return triggerIdentifier;
  }

  private validatePayload(command: CreateWorkflowCommand) {
    const variants = command.steps
      ? command.steps?.flatMap((step) => step.variants || [])
      : [];

    for (const variant of variants) {
      if (isVariantEmpty(variant)) {
        throw new ApiException(
          `Variant conditions are required, variant name ${variant.name} id ${variant._id}`,
        );
      }
    }
  }

  @Instrument()
  private async createNotificationTrigger(
    command: CreateWorkflowCommand,
    triggerIdentifier: string,
  ): Promise<INotificationTrigger> {
    const contentService = new ContentService();
    const { variables, reservedVariables } =
      contentService.extractMessageVariables(command.steps);
    const subscriberVariables =
      contentService.extractSubscriberMessageVariables(command.steps);
    const identifier = await this.generateUniqueIdentifier(
      command,
      triggerIdentifier,
    );

    const trigger: INotificationTrigger = {
      type: TriggerTypeEnum.EVENT,
      identifier,
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

  private async generateUniqueIdentifier(
    command: CreateWorkflowCommand,
    triggerIdentifier: string,
  ) {
    const maxAttempts = 3;
    let identifier = '';

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidateIdentifier =
        attempt === 0 ? triggerIdentifier : `${triggerIdentifier}-${shortId()}`;

      const isIdentifierExist =
        await this.notificationTemplateRepository.findByTriggerIdentifier(
          command.environmentId,
          candidateIdentifier,
        );

      if (!isIdentifierExist) {
        identifier = candidateIdentifier;
        break;
      }
    }

    if (!identifier) {
      throw new ApiException(
        `Unable to generate a unique identifier. Please provide a different workflow name.${command.name}`,
      );
    }

    return identifier;
  }

  private sendTemplateCreationEvent(
    command: CreateWorkflowCommand,
    triggerIdentifier: string,
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
        },
      );
    }
  }

  private async createWorkflowChange(
    command: CreateWorkflowCommand,
    item,
    parentChangeId: string,
  ) {
    if (!isBridgeWorkflow(command.type)) {
      await this.createChange.execute(
        CreateChangeCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          type: ChangeEntityTypeEnum.NOTIFICATION_TEMPLATE,
          item,
          changeId: parentChangeId,
        }),
      );
    }
  }

  @Instrument()
  private async storeWorkflow(
    command: CreateWorkflowCommand,
    templateSteps: INotificationTemplateStep[],
    trigger: INotificationTrigger,
    triggerIdentifier: string,
  ): Promise<WorkflowInternalResponseDto> {
    this.logger.info(`Creating workflow ${JSON.stringify(command)}`);

    const savedWorkflow = await this.notificationTemplateRepository.create({
      _organizationId: command.organizationId,
      _creatorId: command.userId,
      _environmentId: command.environmentId,
      name: command.name,
      active: command.active,
      draft: command.draft,
      critical: command.critical ?? false,
      /** @deprecated - use `userPreferences` instead */
      preferenceSettings:
        GetPreferences.mapWorkflowPreferencesToChannelPreferences(
          command.userPreferences ?? DEFAULT_WORKFLOW_PREFERENCES,
        ),
      tags: command.tags,
      description: command.description,
      steps: templateSteps,
      triggers: [trigger],
      _notificationGroupId: command.notificationGroupId,
      blueprintId: command.blueprintId,
      type: command.type,
      origin: command.origin,
      status: command.status,
      issues: command.issues,
      ...(command.rawData ? { rawData: command.rawData } : {}),
      ...(command.payloadSchema
        ? { payloadSchema: command.payloadSchema }
        : {}),
      ...(command.data ? { data: command.data } : {}),
    });

    // defaultPreferences is required, so we always call the upsert
    await this.upsertPreferences.upsertWorkflowPreferences(
      UpsertWorkflowPreferencesCommand.create({
        templateId: savedWorkflow._id,
        preferences: command.defaultPreferences,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      }),
    );

    if (
      command.userPreferences !== undefined &&
      command.userPreferences !== null
    ) {
      // userPreferences is optional, so we need to check if it's defined before calling the upsert
      await this.upsertPreferences.upsertUserWorkflowPreferences(
        UpsertUserWorkflowPreferencesCommand.create({
          templateId: savedWorkflow._id,
          preferences: command.userPreferences,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
        }),
      );
    }

    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateIdentifierKey({
        templateIdentifier: savedWorkflow.triggers[0].identifier,
        _environmentId: command.environmentId,
      }),
    });
    await this.invalidateCache.invalidateByKey({
      key: buildNotificationTemplateKey({
        _id: savedWorkflow._id,
        _environmentId: command.environmentId,
      }),
    });

    const item = await this.notificationTemplateRepository.findById(
      savedWorkflow._id,
      command.environmentId,
    );
    if (!item)
      throw new NotFoundException(`Workflow ${savedWorkflow._id} is not found`);

    this.sendTemplateCreationEvent(command, triggerIdentifier);

    return this.getWorkflowByIdsUseCase.execute(
      GetWorkflowByIdsCommand.create({
        userId: command.userId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        workflowIdOrInternalId: savedWorkflow._id,
      }),
    );
  }

  @Instrument()
  private async storeTemplateSteps(
    command: CreateWorkflowCommand,
    parentChangeId: string,
  ): Promise<INotificationTemplateStep[]> {
    let parentStepId: string | null = null;
    const templateSteps: INotificationTemplateStep[] = [];

    for (const step of command.steps) {
      if (!step.template)
        throw new ApiException(`Unexpected error: message template is missing`);

      const createdMessageTemplate = await this.createMessageTemplate.execute(
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
          controls: step.template.controls,
          output: step.template.output,
          stepId: step.template.stepId,
          parentChangeId,
          workflowType: command.type,
        }),
      );

      const storedVariants = await this.storeVariantSteps({
        variants: step.variants,
        parentChangeId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        workflowType: command.type,
      });

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
        issues: step.issues,
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
          `Unexpected error: variants message template is missing`,
        );

      const variantTemplate = await this.createMessageTemplate.execute(
        CreateMessageTemplateCommand.create({
          organizationId,
          environmentId,
          userId,
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
        }),
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
      steps,
      notificationGroupId: group._id,
      active: command.active ?? false,
      draft: command.draft ?? true,
      userPreferences: command.userPreferences,
      defaultPreferences: command.defaultPreferences,
      blueprintId: command.blueprintId,
      __source: command.__source,
      type: WorkflowTypeEnum.REGULAR,
      origin: command.origin ?? WorkflowOriginEnum.NOVU_CLOUD,
    });
  }

  private normalizeSteps(commandSteps: NotificationStep[]): NotificationStep[] {
    const steps = JSON.parse(
      JSON.stringify(commandSteps),
    ) as NotificationStep[];

    return steps.map((step) => {
      const { template } = step;
      if (template) {
        template.feedId = undefined;
      }

      return {
        ...step,
        ...(template ? { template } : {}),
      };
    });
  }

  private async handleGroup(
    command: CreateWorkflowCommand,
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

      if (!isBridgeWorkflow(command.type)) {
        await this.createChange.execute(
          CreateChangeCommand.create({
            item: notificationGroup,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
            type: ChangeEntityTypeEnum.NOTIFICATION_GROUP,
            changeId: NotificationGroupRepository.createObjectId(),
          }),
        );
      }
    }

    return notificationGroup;
  }
  private get getBlueprintOrganizationId(): string {
    return NotificationTemplateRepository.getBlueprintOrganizationId() as string;
  }
}
