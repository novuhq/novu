import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  CreateStepConditionsPassedDetail,
  emailControlSchema,
  evaluateRules,
  extractRuleVariables,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  Instrument,
  InstrumentUsecase,
  isMatchingJsonSchema,
  PinoLogger,
  resolveStepControlSchemas,
} from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  EnvironmentRepository,
  JobRepository,
  LocalizationResourceEnum,
  NotificationStepEntity,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  OrganizationEntity,
} from '@novu/dal';
import { workflow } from '@novu/framework/express';
import {
  ActionStep,
  ChannelStep,
  ChatOutputUnvalidated,
  PostActionEnum,
  Schema,
  Step,
  StepOutput,
  Workflow,
} from '@novu/framework/internal';
import {
  type ContentOverrideProviderId,
  EnvironmentTypeEnum,
  getContentOverrideProviderIds,
  LAYOUT_PREVIEW_EMAIL_STEP,
  LAYOUT_PREVIEW_WORKFLOW_ID,
  StepTypeEnum,
  withProviderOverridesRuntimeSchema,
} from '@novu/shared';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';
import _ from 'lodash';
import {
  ChatOutputRendererUsecase,
  ControlsTranslationService,
  EmailOutputRendererUsecase,
  FullPayloadForRender,
  InAppOutputRendererUsecase,
  PushOutputRendererUsecase,
  SmsOutputRendererUsecase,
  ToolOutputRendererUsecase,
} from '../output-renderers';
import { DelayOutputRendererUsecase } from '../output-renderers/delay-output-renderer.usecase';
import { DigestOutputRendererUsecase } from '../output-renderers/digest-output-renderer.usecase';
import { ThrottleOutputRendererUsecase } from '../output-renderers/throttle-output-renderer.usecase';
import { ConstructFrameworkWorkflowCommand } from './construct-framework-workflow.command';

const LOG_CONTEXT = 'ConstructFrameworkWorkflow';

type ProviderOverrideStepType = StepTypeEnum.CHAT | StepTypeEnum.TOOL | StepTypeEnum.PUSH;

interface ISkipEvaluationContext {
  jobId?: string;
  organizationId: string;
  environmentId: string;
}

type SkipFunction = (controlValues: Record<string, unknown>) => Promise<boolean>;

@Injectable()
export class ConstructFrameworkWorkflow {
  constructor(
    private logger: PinoLogger,
    private controlsTranslationService: ControlsTranslationService,
    private workflowsRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository,
    private communityOrganizationRepository: CommunityOrganizationRepository,
    private inAppOutputRendererUseCase: InAppOutputRendererUsecase,
    private emailOutputRendererUseCase: EmailOutputRendererUsecase,
    private smsOutputRendererUseCase: SmsOutputRendererUsecase,
    private chatOutputRendererUseCase: ChatOutputRendererUsecase,
    private pushOutputRendererUseCase: PushOutputRendererUsecase,
    private toolOutputRendererUseCase: ToolOutputRendererUsecase,
    private delayOutputRendererUseCase: DelayOutputRendererUsecase,
    private digestOutputRendererUseCase: DigestOutputRendererUsecase,
    private throttleOutputRendererUseCase: ThrottleOutputRendererUsecase,
    private inMemoryLRUCacheService: InMemoryLRUCacheService,
    private jobRepository: JobRepository,
    private createStepConditionsPassedDetail: CreateStepConditionsPassedDetail
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: ConstructFrameworkWorkflowCommand): Promise<Workflow> {
    if (command.workflowId === LAYOUT_PREVIEW_WORKFLOW_ID) {
      return this.constructLayoutPreviewWorkflow(command);
    }

    const shouldUseCache =
      command.action === PostActionEnum.EXECUTE && command.environmentType !== EnvironmentTypeEnum.DEV;

    const dbWorkflow = await this.getWorkflow(command.environmentId, command.workflowId, shouldUseCache);

    if (command.controlValues) {
      for (const step of dbWorkflow.steps) {
        step.controlVariables = command.controlValues;
      }
    }

    const organization = await this.getOrganization(dbWorkflow._organizationId, shouldUseCache, command.environmentId);

    return this.constructFrameworkWorkflow({
      dbWorkflow,
      organization,
      skipLayoutRendering: command.skipLayoutRendering,
      jobId: command.jobId,
    });
  }

  private async constructLayoutPreviewWorkflow(command: ConstructFrameworkWorkflowCommand): Promise<Workflow> {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId }, '_organizationId');
    if (!environment) {
      throw new InternalServerErrorException(`Environment ${command.environmentId} not found`);
    }

    const organization =
      (await this.communityOrganizationRepository.findById(environment._organizationId)) || undefined;

    const syntheticDbWorkflow: NotificationTemplateEntity = {
      _id: LAYOUT_PREVIEW_WORKFLOW_ID,
      _environmentId: command.environmentId,
      _organizationId: environment._organizationId,
      _creatorId: environment._organizationId,
    } as NotificationTemplateEntity;

    return workflow(LAYOUT_PREVIEW_WORKFLOW_ID, async ({ step, payload, subscriber, context, env }) => {
      await step.email(
        LAYOUT_PREVIEW_EMAIL_STEP,
        async (controlValues) => {
          return this.emailOutputRendererUseCase.execute({
            controlValues,
            fullPayloadForRender: { payload, subscriber, context, steps: {}, env },
            dbWorkflow: syntheticDbWorkflow,
            organization,
            locale: subscriber.locale ?? undefined,
            stepId: LAYOUT_PREVIEW_EMAIL_STEP,
            layoutId: command.layoutId,
          });
        },
        {
          skip: () => false,
          controlSchema: emailControlSchema as unknown as Schema,
          disableOutputSanitization: true,
          providers: {},
        }
      );
    });
  }

  @Instrument()
  private constructFrameworkWorkflow({
    dbWorkflow,
    organization,
    skipLayoutRendering,
    jobId,
  }: {
    dbWorkflow: NotificationTemplateEntity;
    organization?: OrganizationEntity;
    skipLayoutRendering?: boolean;
    jobId?: string;
  }): Workflow {
    return workflow(
      dbWorkflow.triggers[0].identifier,
      async ({ step, payload, subscriber, context, env }) => {
        const fullPayloadForRender: FullPayloadForRender = {
          workflow: dbWorkflow as unknown as Record<string, unknown>,
          payload,
          subscriber,
          context,
          steps: {},
          env,
        };
        for (const staticStep of dbWorkflow.steps) {
          fullPayloadForRender.steps[staticStep.stepId || staticStep._templateId] = await this.constructStep({
            step,
            staticStep,
            fullPayloadForRender,
            dbWorkflow,
            organization,
            locale: subscriber.locale ?? undefined,
            skipLayoutRendering,
            jobId,
          });
        }
      },
      {
        payloadSchema: PERMISSIVE_EMPTY_SCHEMA,
        name: dbWorkflow.name,
        description: dbWorkflow.description,
        tags: dbWorkflow.tags,
        severity: dbWorkflow.severity,

        /*
         * TODO: Workflow options are not needed currently, given that this endpoint
         * focuses on execution only. However we should reconsider if we decide to
         * expose Workflow options to the `workflow` function.
         *
         * preferences: foundWorkflow.preferences,
         * tags: foundWorkflow.tags,
         */
      }
    );
  }

  @Instrument()
  private constructStep({
    step,
    staticStep,
    fullPayloadForRender,
    dbWorkflow,
    organization,
    locale,
    skipLayoutRendering,
    jobId,
  }: {
    step: Step;
    staticStep: NotificationStepEntity;
    fullPayloadForRender: FullPayloadForRender;
    dbWorkflow: NotificationTemplateEntity;
    organization?: OrganizationEntity;
    locale?: string;
    skipLayoutRendering?: boolean;
    jobId?: string;
  }): StepOutput<Record<string, unknown>> {
    const stepTemplate = staticStep.template;

    if (!stepTemplate) {
      this.logger.warn(`Step template not found for step ${staticStep.stepId}, skipping step`, LOG_CONTEXT);

      return step.custom(staticStep.stepId || staticStep._templateId, async () => ({}), {
        controlSchema: PERMISSIVE_EMPTY_SCHEMA,
        skip: () => true,
      });
    }

    const stepType = stepTemplate.type;
    const stepId = staticStep.stepId || staticStep._templateId;
    if (!stepId) {
      throw new InternalServerErrorException(`Step id not found for step ${staticStep._id}`);
    }
    const stepControls = stepTemplate.controls;
    const skip: SkipFunction = (controlValues) =>
      this.processSkipOption(controlValues, fullPayloadForRender, {
        jobId,
        organizationId: dbWorkflow._organizationId,
        environmentId: dbWorkflow._environmentId,
      });

    if (!stepControls) {
      this.logger.warn(`Step controls not found for step ${stepId}, skipping step`, LOG_CONTEXT);

      return step.custom(stepId, async () => ({}), {
        controlSchema: PERMISSIVE_EMPTY_SCHEMA,
        skip: () => true,
      });
    }

    switch (stepType) {
      case StepTypeEnum.IN_APP:
        return step.inApp(
          // The step id is used internally by the framework to identify the step
          stepId,
          // The step callback function. Takes controls and returns the step outputs
          async (controlValues) => {
            return this.inAppOutputRendererUseCase.execute({
              controlValues,
              fullPayloadForRender,
              dbWorkflow,
              organization,
              locale,
            });
          },
          // Step options
          this.constructChannelStepOptions(staticStep, skip)
        );
      case StepTypeEnum.EMAIL:
        return step.email(
          stepId,
          async (controlValues) => {
            return this.emailOutputRendererUseCase.execute({
              controlValues,
              fullPayloadForRender,
              dbWorkflow,
              organization,
              locale,
              skipLayoutRendering,
              jobId,
              stepId,
            });
          },
          this.constructChannelStepOptions(staticStep, skip)
        );
      case StepTypeEnum.SMS:
        return step.sms(
          stepId,
          async (controlValues) => {
            return this.smsOutputRendererUseCase.execute({
              controlValues,
              fullPayloadForRender,
              dbWorkflow,
              organization,
              locale,
            });
          },
          this.constructChannelStepOptions(staticStep, skip)
        );
      case StepTypeEnum.CHAT:
        return step.chat(
          stepId,
          async (controlValues) => {
            // The renderer yields either `{ body }` or `{ card }`; cast to the schema's
            // body-or-card union (`ChatOutputUnvalidated`) that the resolver signature expects.
            return this.chatOutputRendererUseCase.execute({
              controlValues,
              fullPayloadForRender,
              dbWorkflow,
              organization,
              locale,
            }) as Promise<ChatOutputUnvalidated>;
          },
          this.constructProviderOverrideStepOptions(
            staticStep,
            skip,
            fullPayloadForRender,
            dbWorkflow,
            StepTypeEnum.CHAT,
            organization,
            locale
          )
        );
      case StepTypeEnum.PUSH:
        return step.push(
          stepId,
          async (controlValues) => {
            return this.pushOutputRendererUseCase.execute(
              await this.translateContentOverrideControls(controlValues, {
                fullPayloadForRender,
                dbWorkflow,
                organization,
                locale,
              })
            );
          },
          this.constructProviderOverrideStepOptions(
            staticStep,
            skip,
            fullPayloadForRender,
            dbWorkflow,
            StepTypeEnum.PUSH,
            organization,
            locale
          )
        );
      case StepTypeEnum.TOOL:
        return step.tool(
          stepId,
          async (controlValues) => {
            return this.toolOutputRendererUseCase.execute(
              await this.translateContentOverrideControls(controlValues, {
                fullPayloadForRender,
                dbWorkflow,
                organization,
                locale,
              })
            );
          },
          this.constructProviderOverrideStepOptions(
            staticStep,
            skip,
            fullPayloadForRender,
            dbWorkflow,
            StepTypeEnum.TOOL,
            organization,
            locale
          )
        );
      case StepTypeEnum.DIGEST:
        return step.digest(
          stepId,
          async (controlValues) => {
            return this.digestOutputRendererUseCase.execute({ controlValues, fullPayloadForRender });
          },
          this.constructActionStepOptions(staticStep, skip)
        );
      case StepTypeEnum.DELAY:
        return step.delay(
          stepId,
          async (controlValues) => {
            return this.delayOutputRendererUseCase.execute({ controlValues, fullPayloadForRender });
          },
          this.constructActionStepOptions(staticStep, skip)
        );
      case StepTypeEnum.THROTTLE:
        return step.throttle(
          stepId,
          async (controlValues) => {
            return this.throttleOutputRendererUseCase.execute({ controlValues, fullPayloadForRender });
          },
          this.constructActionStepOptions(staticStep, skip)
        );
      /*
       * Custom steps are executed by the worker, bypassing the bridge entirely. However, when a subsequent
       * step triggers a bridge call, the framework reconstructs the full workflow from the DB and iterates
       * over every step — including these. We must register each such step here so the framework can build
       * the workflow graph correctly. The resolve function is a passthrough because execution already happened.
       */
      case StepTypeEnum.HTTP_REQUEST:
        return step.custom(
          stepId,
          async (controlValues) => {
            return controlValues;
          },
          this.constructActionStepOptions(staticStep, skip)
        );
      case StepTypeEnum.CUSTOM:
        return step.custom(
          stepId,
          async (controlValues) => {
            return controlValues;
          },
          this.constructActionStepOptions(staticStep, skip)
        );
      default:
        throw new InternalServerErrorException(`Step type ${stepType} is not supported`);
    }
  }

  @Instrument()
  private constructChannelStepOptions(
    staticStep: NotificationStepEntity,
    skip: SkipFunction
  ): Required<Parameters<ChannelStep>[2]> {
    return {
      skip,
      controlSchema: staticStep.template!.controls!.schema as unknown as Schema,
      disableOutputSanitization: true,
      providers: {},
    };
  }

  /** One translation per controls object for chat/tool/push resolve + provider resolvers. */
  private contentOverrideTranslationCache?: WeakMap<object, Promise<Record<string, unknown>>>;

  private translateContentOverrideControls(
    controls: Record<string, unknown>,
    {
      fullPayloadForRender,
      dbWorkflow,
      organization,
      locale,
    }: {
      fullPayloadForRender: FullPayloadForRender;
      dbWorkflow: NotificationTemplateEntity;
      organization?: OrganizationEntity;
      locale?: string;
    }
  ): Promise<Record<string, unknown>> {
    this.contentOverrideTranslationCache ??= new WeakMap();

    const cached = this.contentOverrideTranslationCache.get(controls);
    if (cached) {
      return cached;
    }

    const { skip: _skip, ...rest } = controls;
    const translatedControlsPromise = this.controlsTranslationService.processTranslations({
      controls: rest,
      variables: fullPayloadForRender,
      environmentId: dbWorkflow._environmentId,
      organizationId: dbWorkflow._organizationId,
      resourceId: dbWorkflow._id,
      resourceType: LocalizationResourceEnum.WORKFLOW,
      locale,
      resourceEntity: dbWorkflow,
      organization,
    });

    this.contentOverrideTranslationCache.set(controls, translatedControlsPromise);

    return translatedControlsPromise;
  }

  /**
   * Chat/tool/push step options: canonical control schema plus runtime `providerOverrides`,
   * and resolvers that project a provider slice from the shared translated controls.
   */
  @Instrument()
  private constructProviderOverrideStepOptions(
    staticStep: NotificationStepEntity,
    skip: SkipFunction,
    fullPayloadForRender: FullPayloadForRender,
    dbWorkflow: NotificationTemplateEntity,
    stepType: ProviderOverrideStepType,
    organization?: OrganizationEntity,
    locale?: string
  ): Required<Parameters<ChannelStep>[2]> {
    const controlSchema = dbWorkflow.origin
      ? resolveStepControlSchemas({
          stepType,
          workflowOrigin: dbWorkflow.origin,
          existingControls: staticStep.template?.controls,
          stepResolverHash: staticStep.template?.stepResolverHash,
        }).schema
      : staticStep.template!.controls!.schema;

    const resolveProviderOverride =
      (providerId: ContentOverrideProviderId) =>
      async ({ controls }: { controls: Record<string, unknown> }) => {
        const translated = await this.translateContentOverrideControls(controls, {
          fullPayloadForRender,
          dbWorkflow,
          organization,
          locale,
        });
        const blob = (translated.providerOverrides as Record<string, unknown> | undefined)?.[providerId];
        if (!blob || typeof blob !== 'object' || Array.isArray(blob)) {
          return {};
        }

        return blob as Record<string, unknown>;
      };

    const providers = Object.fromEntries(
      getContentOverrideProviderIds(stepType).map((providerId) => [providerId, resolveProviderOverride(providerId)])
    );

    return {
      skip,
      controlSchema: withProviderOverridesRuntimeSchema(
        controlSchema as { properties?: Record<string, unknown> }
      ) as unknown as Schema,
      disableOutputSanitization: true,
      providers,
    } as Required<Parameters<ChannelStep>[2]>;
  }

  @Instrument()
  private constructActionStepOptions(
    staticStep: NotificationStepEntity,
    skip: SkipFunction
  ): Required<Parameters<ActionStep>[2]> {
    const stepType = staticStep.template!.type;
    const controlSchema = this.optionalAugmentControlSchemaDueToAjvBug(staticStep, stepType);

    return {
      controlSchema: controlSchema as unknown as Schema,
      skip,
    };
  }

  private optionalAugmentControlSchemaDueToAjvBug(staticStep: NotificationStepEntity, stepType: StepTypeEnum) {
    let controlSchema = staticStep.template!.controls!.schema;

    /*
     * because of the known AJV issue with anyOf, we need to find the first schema that matches the control values
     * ref: https://ajv.js.org/guide/modifying-data.html#assigning-defaults
     */
    if (stepType === StepTypeEnum.DIGEST && typeof controlSchema === 'object' && controlSchema.anyOf) {
      const fistSchemaMatch = controlSchema.anyOf.find((item) => {
        return isMatchingJsonSchema(item, staticStep.controlVariables);
      });
      controlSchema = fistSchemaMatch ?? controlSchema.anyOf[0];
    }

    return controlSchema;
  }

  @Instrument()
  private async getWorkflow(
    environmentId: string,
    workflowId: string,
    shouldUseCache: boolean
  ): Promise<NotificationTemplateEntity> {
    const workflow = await this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.WORKFLOW,
      `${environmentId}:${workflowId}`,
      async () => {
        const foundWorkflow = await this.workflowsRepository.findByTriggerIdentifier(
          environmentId,
          workflowId,
          null,
          false
        );
        if (!foundWorkflow) {
          throw new InternalServerErrorException(`Workflow ${workflowId} not found`);
        }

        return foundWorkflow;
      },
      {
        environmentId,
        skipCache: !shouldUseCache,
      }
    );

    if (!workflow) {
      throw new InternalServerErrorException(`Workflow ${workflowId} not found`);
    }

    return workflow;
  }

  private async getOrganization(
    organizationId: string,
    shouldUseCache: boolean,
    environmentId: string
  ): Promise<OrganizationEntity | undefined> {
    const organization = await this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.ORGANIZATION,
      organizationId,
      () => this.communityOrganizationRepository.findById(organizationId),
      {
        environmentId,
        organizationId,
        skipCache: !shouldUseCache,
      }
    );

    return organization || undefined;
  }

  private async processSkipOption(
    controlValues: { [x: string]: unknown },
    variables: FullPayloadForRender,
    skipContext: ISkipEvaluationContext
  ): Promise<boolean> {
    const skipRules = controlValues.skip as RulesLogic<AdditionalOperation>;

    if (_.isEmpty(skipRules)) {
      return false;
    }

    const evaluationData = {
      ...variables,
      subscriber: {
        ...variables.subscriber,
        isOnline: variables.subscriber.isOnline ?? false,
      },
    };

    const { result, error } = evaluateRules(skipRules, evaluationData);

    if (error) {
      this.logger.error({ err: error }, 'Failed to evaluate skip rule', LOG_CONTEXT);
    }

    // The Step Conditions in the Dashboard control the step execution, that's why we need to invert the result.
    const shouldSkip = !result;

    if (!shouldSkip) {
      await this.traceConditionsPassed(skipRules, evaluationData, skipContext);
    }

    return shouldSkip;
  }

  /**
   * The framework only invokes the skip function for the currently executing step
   * (never in preview), so this runs at most once per job execution. jobId is
   * absent for preview/test constructions, where no trace should be written.
   * Failures are swallowed: tracing must never break a send.
   */
  private async traceConditionsPassed(
    skipRules: RulesLogic<AdditionalOperation>,
    evaluationData: FullPayloadForRender,
    { jobId, organizationId, environmentId }: ISkipEvaluationContext
  ): Promise<void> {
    if (!jobId || !(await this.createStepConditionsPassedDetail.isEnabled({ organizationId, environmentId }))) {
      return;
    }

    try {
      const job = await this.jobRepository.findOne({ _id: jobId, _environmentId: environmentId });
      if (!job) {
        return;
      }

      await this.createStepConditionsPassedDetail.execute({
        job,
        conditions: skipRules,
        evaluatedValues: extractRuleVariables(skipRules, evaluationData),
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create step conditions passed execution detail', LOG_CONTEXT);
    }
  }
}

const PERMISSIVE_EMPTY_SCHEMA = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: true,
} as const;
