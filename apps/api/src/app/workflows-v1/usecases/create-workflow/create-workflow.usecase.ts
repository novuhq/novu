/* eslint-disable global-require */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import {
  JsonSchemaTypeEnum,
  LocalizationResourceEnum,
  NotificationGroupEntity,
  NotificationGroupRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  ChangeEntityTypeEnum,
  DEFAULT_WORKFLOW_PREFERENCES,
  FeatureFlagsKeysEnum,
  INotificationTemplateStep,
  INotificationTrigger,
  isBridgeWorkflow,
  IStepVariant,
  slugify,
  TriggerTypeEnum,
  ResourceOriginEnum,
  ResourceTypeEnum,
} from '@novu/shared';

import {
  CreateChange,
  CreateChangeCommand,
  AnalyticsService,
  ContentService,
  FeatureFlagsService,
  CreateMessageTemplate,
  CreateMessageTemplateCommand,
  isVariantEmpty,
  PlatformException,
  shortId,
  UpsertPreferences,
  UpsertUserWorkflowPreferencesCommand,
  UpsertWorkflowPreferencesCommand,
  GetPreferences,
  Instrument,
  InstrumentUsecase,
  ResourceValidatorService,
  PinoLogger,
  NotificationStep,
  NotificationStepVariantCommand,
} from '@novu/application-generic';
import { CreateWorkflowCommand } from './create-workflow.command';
import { GetWorkflowWithPreferencesCommand } from '../get-workflow-with-preferences/get-workflow-with-preferences.command';
import { GetWorkflowWithPreferencesUseCase } from '../get-workflow-with-preferences/get-workflow-with-preferences.usecase';
import { WorkflowWithPreferencesResponseDto } from '../../dtos/get-workflow-with-preferences.dto';

/**
 * @deprecated - use `UpsertWorkflow` instead
 */
@Injectable()
export class CreateWorkflow {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private createMessageTemplate: CreateMessageTemplate,
    private createChange: CreateChange,
    private analyticsService: AnalyticsService,
    private logger: PinoLogger,
    protected moduleRef: ModuleRef,
    private upsertPreferences: UpsertPreferences,
    private getWorkflowWithPreferencesUseCase: GetWorkflowWithPreferencesUseCase,
    private resourceValidatorService: ResourceValidatorService,
    private featureFlagService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(usecaseCommand: CreateWorkflowCommand): Promise<WorkflowWithPreferencesResponseDto> {
    const blueprintCommand = await this.processBlueprint(usecaseCommand);
    const command = blueprintCommand ?? usecaseCommand;
    await this.validatePayload(command);
    await this.resourceValidatorService.validateWorkflowLimit(command.environmentId);

    let storedWorkflow!: WorkflowWithPreferencesResponseDto;
    await this.notificationTemplateRepository.withTransaction(async () => {
      const triggerIdentifier = this.generateTriggerIdentifier(command);

      const parentChangeId: string = NotificationTemplateRepository.createObjectId();

      const templateSteps = await this.storeTemplateSteps(command, parentChangeId);
      const trigger = await this.createNotificationTrigger(command, triggerIdentifier);
      const isPayloadSchemaEnabled = await this.featureFlagService.getFlag({
        key: FeatureFlagsKeysEnum.IS_PAYLOAD_SCHEMA_ENABLED,
        defaultValue: false,
        organization: { _id: command.organizationId },
        environment: { _id: command.environmentId },
      });

      if (isPayloadSchemaEnabled && !command.payloadSchema) {
        command.payloadSchema = {
          type: JsonSchemaTypeEnum.OBJECT,
          additionalProperties: true,
          properties: {},
        };

        command.validatePayload = command.validatePayload ?? true;
      }

      storedWorkflow = await this.storeWorkflow(command, templateSteps, trigger, triggerIdentifier);

      if (command.isTranslationEnabled !== undefined) {
        await this.toggleV2TranslationsForWorkflow(triggerIdentifier, command);
      }

      await this.createWorkflowChange(command, storedWorkflow, parentChangeId);
    });

    try {
      if (
        (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') &&
        storedWorkflow.origin === ResourceOriginEnum.NOVU_CLOUD_V1
      ) {
        if (!require('@novu/ee-shared-services')?.TranslationsService) {
          throw new PlatformException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(require('@novu/ee-shared-services')?.TranslationsService, { strict: false });

        const locales = await service.createTranslationAnalytics(storedWorkflow);

        this.analyticsService.track('Locale used in workflow - [Translations]', command.userId, {
          _organization: command.organizationId,
          _environment: command.environmentId,
          workflowId: storedWorkflow._id,
          locales,
        });
      }
    } catch (e) {
      this.logger.error(e, `Unexpected error while importing enterprise modules`, 'TranslationsService');
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

  private async toggleV2TranslationsForWorkflow(workflowIdentifier: string, command: CreateWorkflowCommand) {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';

    if (!isEnterprise) {
      return;
    }

    try {
      const manageTranslations = this.moduleRef.get(require('@novu/ee-translation')?.ManageTranslations, {
        strict: false,
      });

      await manageTranslations.execute({
        enabled: command.isTranslationEnabled,
        resourceId: workflowIdentifier,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to ${command.isTranslationEnabled ? 'enable' : 'disable'} V2 translations for workflow`,
        {
          workflowIdentifier,
          enabled: command.isTranslationEnabled,
          organizationId: command.organizationId,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      throw error;
    }
  }

  private generateTriggerIdentifier(command: CreateWorkflowCommand) {
    if (command.triggerIdentifier) {
      return command.triggerIdentifier;
    }

    let triggerIdentifier: string;
    if (command.type === ResourceTypeEnum.BRIDGE && command.origin === ResourceOriginEnum.EXTERNAL)
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

  private async validatePayload(command: CreateWorkflowCommand) {
    if (command.steps) {
      await this.resourceValidatorService.validateStepsLimit(
        command.environmentId,
        command.organizationId,
        command.steps
      );
    }

    const variants = command.steps ? command.steps?.flatMap((step) => step.variants || []) : [];

    for (const variant of variants) {
      if (isVariantEmpty(variant)) {
        throw new BadRequestException(
          `Variant conditions are required, variant name ${variant.name} id ${variant._id}`
        );
      }
    }
  }

  @Instrument()
  private async createNotificationTrigger(
    command: CreateWorkflowCommand,
    triggerIdentifier: string
  ): Promise<INotificationTrigger> {
    const contentService = new ContentService();
    const { variables, reservedVariables } = contentService.extractMessageVariables(command.steps);
    const subscriberVariables = contentService.extractSubscriberMessageVariables(command.steps);
    const identifier = await this.generateUniqueIdentifier(command, triggerIdentifier);

    return {
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
  }

  private async generateUniqueIdentifier(command: CreateWorkflowCommand, triggerIdentifier: string) {
    const maxAttempts = 3;
    let identifier = '';

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidateIdentifier = attempt === 0 ? triggerIdentifier : `${triggerIdentifier}-${shortId()}`;

      const isIdentifierExist = await this.notificationTemplateRepository.findByTriggerIdentifier(
        command.environmentId,
        candidateIdentifier
      );

      if (!isIdentifierExist) {
        identifier = candidateIdentifier;
        break;
      }
    }

    if (!identifier) {
      throw new BadRequestException(
        `Unable to generate a unique identifier. Please provide a different workflow name.${command.name}`
      );
    }

    return identifier;
  }

  private sendTemplateCreationEvent(command: CreateWorkflowCommand, triggerIdentifier: string) {
    if (command.name !== 'On-boarding notification' && !command.__source?.startsWith('onboarding_')) {
      this.analyticsService.track('Create Notification Template - [Platform]', command.userId, {
        _organization: command.organizationId,
        steps: command.steps?.length,
        channels: command.steps?.map((i) => i.template?.type),
        __source: command.__source,
        triggerIdentifier,
      });
    }
  }

  private async createWorkflowChange(command: CreateWorkflowCommand, item, parentChangeId: string) {
    if (!isBridgeWorkflow(command.type)) {
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

  @Instrument()
  private async storeWorkflow(
    command: CreateWorkflowCommand,
    templateSteps: INotificationTemplateStep[],
    trigger: INotificationTrigger,
    triggerIdentifier: string
  ): Promise<WorkflowWithPreferencesResponseDto> {
    this.logger.info(`Creating workflow ${JSON.stringify(command)}`);

    const workflowData = {
      _organizationId: command.organizationId,
      _creatorId: command.userId,
      _environmentId: command.environmentId,
      name: command.name,
      active: command.active,
      draft: command.draft,
      critical: command.critical ?? false,
      /** @deprecated - use `userPreferences` instead */
      preferenceSettings: GetPreferences.mapWorkflowPreferencesToChannelPreferences(
        command.userPreferences ?? DEFAULT_WORKFLOW_PREFERENCES
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
      ...(command.payloadSchema ? { payloadSchema: command.payloadSchema } : {}),
      ...(command.validatePayload !== undefined ? { validatePayload: command.validatePayload } : {}),
      ...(command.data ? { data: command.data } : {}),
    };

    const savedWorkflow = await this.notificationTemplateRepository.create(workflowData);

    // defaultPreferences is required, so we always call the upsert
    await this.upsertPreferences.upsertWorkflowPreferences(
      UpsertWorkflowPreferencesCommand.create({
        templateId: savedWorkflow._id,
        preferences: command.defaultPreferences,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );

    if (command.userPreferences !== undefined && command.userPreferences !== null) {
      // userPreferences is optional, so we need to check if it's defined before calling the upsert
      await this.upsertPreferences.upsertUserWorkflowPreferences(
        UpsertUserWorkflowPreferencesCommand.create({
          templateId: savedWorkflow._id,
          preferences: command.userPreferences,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
        })
      );
    }

    const item = await this.notificationTemplateRepository.findById(savedWorkflow._id, command.environmentId);
    if (!item) throw new NotFoundException(`Workflow ${savedWorkflow._id} is not found`);

    this.sendTemplateCreationEvent(command, triggerIdentifier);

    return this.getWorkflowWithPreferencesUseCase.execute(
      GetWorkflowWithPreferencesCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        workflowIdOrInternalId: savedWorkflow._id,
      })
    );
  }

  @Instrument()
  private async storeTemplateSteps(
    command: CreateWorkflowCommand,
    parentChangeId: string
  ): Promise<INotificationTemplateStep[]> {
    let parentStepId: string | null = null;
    const templateSteps: INotificationTemplateStep[] = [];

    for (const step of command.steps) {
      if (!step.template) throw new BadRequestException(`Unexpected error: message template is missing`);

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
        })
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
    workflowType: ResourceTypeEnum;
  }): Promise<IStepVariant[]> {
    if (!variants?.length) return [];

    const variantsList: IStepVariant[] = [];
    let parentVariantId: string | null = null;

    for (const variant of variants) {
      if (!variant.template) throw new BadRequestException(`Unexpected error: variants message template is missing`);

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
      steps,
      notificationGroupId: group._id,
      active: command.active ?? false,
      draft: command.draft ?? true,
      userPreferences: command.userPreferences,
      defaultPreferences: command.defaultPreferences,
      blueprintId: command.blueprintId,
      __source: command.__source,
      type: ResourceTypeEnum.REGULAR,
      origin: command.origin ?? ResourceOriginEnum.NOVU_CLOUD,
    });
  }

  private normalizeSteps(commandSteps: NotificationStep[]): NotificationStep[] {
    const steps = JSON.parse(JSON.stringify(commandSteps)) as NotificationStep[];

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

  private async handleGroup(command: CreateWorkflowCommand): Promise<NotificationGroupEntity> {
    if (!command.notificationGroup?.name) throw new NotFoundException(`Notification group was not provided`);

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
          })
        );
      }
    }

    return notificationGroup;
  }
}
