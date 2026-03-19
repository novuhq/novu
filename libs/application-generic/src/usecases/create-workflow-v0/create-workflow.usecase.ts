import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  ClientSession,
  JsonSchemaTypeEnum,
  LocalizationResourceEnum,
  NotificationGroupEntity,
  NotificationGroupRepository,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  ChangeEntityTypeEnum,
  DEFAULT_WORKFLOW_PREFERENCES,
  INotificationTemplateStep,
  INotificationTrigger,
  IStepVariant,
  isBridgeWorkflow,
  ResourceOriginEnum,
  ResourceTypeEnum,
  slugify,
  TriggerTypeEnum,
} from '@novu/shared';
import { PinoLogger } from 'nestjs-pino';
import { WorkflowWithPreferencesResponseDto } from '../../dtos/get-workflow-with-preferences.dto';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { AnalyticsService, ContentService } from '../../services';
import { ResourceValidatorService } from '../../services/resource-validator.service';
import { isVariantEmpty, PlatformException, shortId } from '../../utils';
import { MANAGE_TRANSLATIONS, TRANSLATIONS_SERVICE } from '../../utils/constants';
import { NotificationStep, NotificationStepVariantCommand } from '../../value-objects';
import { CreateChange, CreateChangeCommand } from '../create-change';
import { GetPreferences } from '../get-preferences';
import { GetWorkflowWithPreferencesUseCase } from '../get-workflow-with-preferences';
import { CreateMessageTemplate, CreateMessageTemplateCommand } from '../message-template';
import {
  UpsertPreferences,
  UpsertUserWorkflowPreferencesCommand,
  UpsertWorkflowPreferencesCommand,
} from '../upsert-preferences';
import { CreateWorkflowCommandV0 } from './create-workflow.command';

/**
 * @deprecated - use `UpsertWorkflow` instead
 */
@Injectable()
export class CreateWorkflowV0 {
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
    private resourceValidatorService: ResourceValidatorService
  ) {}

  @InstrumentUsecase()
  async execute(usecaseCommand: CreateWorkflowCommandV0): Promise<WorkflowWithPreferencesResponseDto> {
    const blueprintCommand = await this.processBlueprint(usecaseCommand);
    const command = blueprintCommand ?? usecaseCommand;
    await this.validatePayload(command);
    await this.resourceValidatorService.validateWorkflowLimit(command.environmentId);

    let storedWorkflow!: WorkflowWithPreferencesResponseDto;

    const workflowCreation = async (session?: ClientSession | null) => {
      const triggerIdentifier = this.generateTriggerIdentifier(command);

      const parentChangeId: string = NotificationTemplateRepository.createObjectId();

      const templateSteps = await this.storeTemplateSteps(command, parentChangeId, session);
      const trigger = await this.createNotificationTrigger(command, triggerIdentifier);
      if (!command.payloadSchema) {
        command.payloadSchema = {
          type: JsonSchemaTypeEnum.OBJECT,
          additionalProperties: true,
          properties: {},
        };

        command.validatePayload = command.validatePayload ?? true;
      }

      storedWorkflow = await this.storeWorkflow(command, templateSteps, trigger, triggerIdentifier, session);

      if (command.isTranslationEnabled !== undefined) {
        await this.toggleV2TranslationsForWorkflow(triggerIdentifier, command, storedWorkflow, session);
      }

      await this.createWorkflowChange(command, storedWorkflow, parentChangeId);
    };

    if (command.session) {
      // If session is provided, use it (we're already in a transaction)
      await workflowCreation(command.session);
    } else {
      // If no session, create our own transaction
      await this.notificationTemplateRepository.withTransaction(async (session) => {
        await workflowCreation(session);
      });
    }

    try {
      if (
        (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') &&
        storedWorkflow.origin === ResourceOriginEnum.NOVU_CLOUD_V1
      ) {
        if (!this.moduleRef.get(TRANSLATIONS_SERVICE, { strict: false })) {
          throw new PlatformException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(TRANSLATIONS_SERVICE, { strict: false });

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

  private async toggleV2TranslationsForWorkflow(
    workflowIdentifier: string,
    command: CreateWorkflowCommandV0,
    workflowEntity: WorkflowWithPreferencesResponseDto,
    session?: ClientSession | null
  ) {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';

    if (!isEnterprise || isSelfHosted) {
      return;
    }

    try {
      const manageTranslations = this.moduleRef.get(MANAGE_TRANSLATIONS, {
        strict: false,
      });

      await manageTranslations.execute({
        enabled: command.isTranslationEnabled,
        resourceId: workflowIdentifier,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        session,
        resourceEntity: workflowEntity,
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

  private generateTriggerIdentifier(command: CreateWorkflowCommandV0) {
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

  private async validatePayload(command: CreateWorkflowCommandV0) {
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
    command: CreateWorkflowCommandV0,
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

  private async generateUniqueIdentifier(command: CreateWorkflowCommandV0, triggerIdentifier: string) {
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

  private sendTemplateCreationEvent(command: CreateWorkflowCommandV0, triggerIdentifier: string) {
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

  private async createWorkflowChange(command: CreateWorkflowCommandV0, item, parentChangeId: string) {
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
    command: CreateWorkflowCommandV0,
    templateSteps: INotificationTemplateStep[],
    trigger: INotificationTrigger,
    triggerIdentifier: string,
    session?: ClientSession | null
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
      severity: command.severity,
      ...(command.updatedBy ? { _updatedBy: command.updatedBy } : {}),
      ...(command.rawData ? { rawData: command.rawData } : {}),
      ...(command.payloadSchema ? { payloadSchema: command.payloadSchema } : {}),
      ...(command.validatePayload !== undefined ? { validatePayload: command.validatePayload } : {}),
      ...(command.data ? { data: command.data } : {}),
    };

    const savedWorkflow = await this.notificationTemplateRepository.create(workflowData, { session });

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

    const item = await this.notificationTemplateRepository.findById(savedWorkflow._id, command.environmentId, session);
    if (!item) throw new NotFoundException(`Workflow ${savedWorkflow._id} is not found`);

    this.sendTemplateCreationEvent(command, triggerIdentifier);

    return this.getWorkflowWithPreferencesUseCase.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      workflowIdOrInternalId: savedWorkflow._id,
      session,
    });
  }

  @Instrument()
  private async storeTemplateSteps(
    command: CreateWorkflowCommandV0,
    parentChangeId: string,
    session?: ClientSession | null
  ): Promise<INotificationTemplateStep[]> {
    let parentStepId: string | null = null;
    const templateSteps: INotificationTemplateStep[] = [];

    for (const step of command.steps) {
      if (!step.template) throw new BadRequestException(`Unexpected error: message template is missing`);

      const messageTemplateCommand = {
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
        ...(session ? { session } : {}),
      };

      const createdMessageTemplate = await this.createMessageTemplate.execute(
        CreateMessageTemplateCommand.create(messageTemplateCommand)
      );

      const storedVariants = await this.storeVariantSteps(
        {
          variants: step.variants,
          parentChangeId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          workflowType: command.type,
        },
        session
      );

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

  private async storeVariantSteps(
    {
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
    },
    session?: ClientSession | null
  ): Promise<IStepVariant[]> {
    if (!variants?.length) return [];

    const variantsList: IStepVariant[] = [];
    let parentVariantId: string | null = null;

    for (const variant of variants) {
      if (!variant.template) throw new BadRequestException(`Unexpected error: variants message template is missing`);

      const variantTemplateCommand = {
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
        ...(session ? { session } : {}),
      };

      const variantTemplate = await this.createMessageTemplate.execute(
        CreateMessageTemplateCommand.create(variantTemplateCommand)
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

  private async processBlueprint(command: CreateWorkflowCommandV0) {
    if (!command.blueprintId) return null;

    const group: NotificationGroupEntity = await this.handleGroup(command);
    const steps: NotificationStep[] = this.normalizeSteps(command.steps);

    return CreateWorkflowCommandV0.create({
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

  private async handleGroup(command: CreateWorkflowCommandV0): Promise<NotificationGroupEntity> {
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
