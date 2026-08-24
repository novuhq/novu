import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ClientSession,
  ControlSchemas,
  ControlValuesEntity,
  ControlValuesRepository,
  NotificationGroupRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import {
  buildWorkflowPreferences,
  ControlValuesLevelEnum,
  ResourceOriginEnum,
  ResourceTypeEnum,
  type StepProviderOverrides,
  StepTypeEnum,
  WebhookEventEnum,
  WebhookObjectTypeEnum,
  WorkflowCreationSourceEnum,
} from '@novu/shared';
import { PinoLogger } from 'nestjs-pino';
import { format } from 'prettier';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { StepIssuesDto } from '../../dtos/step-issues.dto';
import { EmailRenderOutput } from '../../dtos/workflow/generate-preview-response.dto';
import { WorkflowResponseDto } from '../../dtos/workflow/workflow-response.dto';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { ChatControlType, EmailControlType } from '../../schemas/control';
import { AnalyticsService } from '../../services';
import {
  computeWorkflowStatus,
  isSupportedProviderOverrideId,
  removeBrandingFromHtml,
  resolveStepControlSchemas,
  shortId,
  slugifyOrRandom,
} from '../../utils';
import { isStringifiedMailyJSONContent } from '../../utils/maily-utils';
import { resolveChatEditorType } from '../../utils/resolve-chat-editor-type';
import { isStepResolverActive } from '../../utils/step-resolver-control-state';
import { NotificationStep } from '../../value-objects';
import { SendWebhookMessage } from '../../webhooks';
import { BuildStepIssuesUsecase } from '../build-step-issues';
import { CreateWorkflowCommandV0, CreateWorkflowV0 } from '../create-workflow-v0';
import { GetLayoutCommand, GetLayoutUseCase } from '../get-layout-v2';
import { GetWorkflowCommand, GetWorkflowUseCase } from '../get-workflow';
import { PreviewCommand, PreviewUsecase } from '../preview';
import { UpdateWorkflowCommandV0, UpdateWorkflowV0 } from '../update-workflow-v0';
import { UpsertControlValuesCommand, UpsertControlValuesUseCase } from '../upsert-control-values';
import { GetWorkflowByIdsCommand, GetWorkflowByIdsUseCase } from '../workflow';
import { UpsertStepDataCommand, UpsertWorkflowCommand } from './upsert-workflow.command';

@Injectable()
export class UpsertWorkflowUseCase {
  constructor(
    private createWorkflowV0Usecase: CreateWorkflowV0,
    private updateWorkflowV0Usecase: UpdateWorkflowV0,
    private notificationGroupRepository: NotificationGroupRepository,
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private getWorkflowUseCase: GetWorkflowUseCase,
    private buildStepIssuesUsecase: BuildStepIssuesUsecase,
    private controlValuesRepository: ControlValuesRepository,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase,
    private previewUsecase: PreviewUsecase,
    private getLayoutUseCase: GetLayoutUseCase,
    private analyticsService: AnalyticsService,
    private logger: PinoLogger,
    private sendWebhookMessage: SendWebhookMessage
  ) {}

  @InstrumentUsecase()
  async execute(command: UpsertWorkflowCommand): Promise<WorkflowResponseDto> {
    const existingWorkflow = command.workflowIdOrInternalId
      ? await this.getWorkflowByIdsUseCase.execute(
          GetWorkflowByIdsCommand.create({
            environmentId: command.user.environmentId,
            organizationId: command.user.organizationId,
            workflowIdOrInternalId: command.workflowIdOrInternalId,
            session: command.session,
          })
        )
      : null;

    const resolvedCommand = this.resolveWorkflowOrigin(command, existingWorkflow);

    let upsertedWorkflow: NotificationTemplateEntity;

    if (existingWorkflow) {
      this.mixpanelTrack(resolvedCommand, 'Workflow Update - [API]');

      upsertedWorkflow = await this.updateWorkflowV0Usecase.execute(
        UpdateWorkflowCommandV0.create({
          ...(await this.buildUpdateWorkflowCommand(resolvedCommand, existingWorkflow)),
          session: resolvedCommand.session,
        })
      );
    } else {
      this.mixpanelTrack(resolvedCommand, 'Workflow Created - [API]');

      upsertedWorkflow = await this.createWorkflowV0Usecase.execute(
        CreateWorkflowCommandV0.create({
          ...(await this.buildCreateWorkflowCommand(resolvedCommand)),
          session: resolvedCommand.session,
        })
      );
    }

    await this.upsertControlValues(upsertedWorkflow, resolvedCommand);

    const updatedWorkflow = await this.getWorkflowUseCase.execute(
      GetWorkflowCommand.create({
        workflowIdOrInternalId: upsertedWorkflow._id,
        user: command.user,
        // Read-after-write: must reflect the preferences we just persisted.
        skipPreferencesCache: true,
      })
    );

    if (existingWorkflow) {
      await this.sendWebhookMessage.execute({
        eventType: WebhookEventEnum.WORKFLOW_UPDATED,
        objectType: WebhookObjectTypeEnum.WORKFLOW,
        payload: {
          object: updatedWorkflow as unknown as Record<string, unknown>,
          previousObject: existingWorkflow as unknown as Record<string, unknown>,
        },
        organizationId: command.user.organizationId,
        environmentId: command.user.environmentId,
      });
    } else {
      await this.sendWebhookMessage.execute({
        eventType: WebhookEventEnum.WORKFLOW_CREATED,
        objectType: WebhookObjectTypeEnum.WORKFLOW,
        payload: {
          object: updatedWorkflow as unknown as Record<string, unknown>,
        },
        organizationId: command.user.organizationId,
        environmentId: command.user.environmentId,
      });
    }

    return updatedWorkflow;
  }

  private resolveWorkflowOrigin(
    command: UpsertWorkflowCommand,
    existingWorkflow: NotificationTemplateEntity | null
  ): UpsertWorkflowCommand {
    // On update, always keep the persisted origin — request body origin is ignored.
    const origin = existingWorkflow
      ? (existingWorkflow.origin ?? ResourceOriginEnum.NOVU_CLOUD)
      : (command.workflowDto.origin ?? ResourceOriginEnum.NOVU_CLOUD);

    return {
      ...command,
      workflowDto: {
        ...command.workflowDto,
        origin,
      },
    };
  }

  @Instrument()
  private async buildCreateWorkflowCommand(command: UpsertWorkflowCommand): Promise<CreateWorkflowCommandV0> {
    const { user, workflowDto, preserveWorkflowId } = command;
    const isWorkflowActive = workflowDto?.active ?? true;
    const notificationGroupId = await this.getNotificationGroup(command.user.environmentId, command.session);

    const steps = await this.buildSteps(command);

    return {
      notificationGroupId,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      updatedBy: user._id,
      userId: user._id,
      name: workflowDto.name,
      __source: workflowDto.__source || WorkflowCreationSourceEnum.DASHBOARD,
      type: ResourceTypeEnum.BRIDGE,
      origin: ResourceOriginEnum.NOVU_CLOUD,
      steps,
      active: isWorkflowActive,
      description: workflowDto.description || '',
      tags: workflowDto.tags || [],
      userPreferences: workflowDto.preferences?.user ? buildWorkflowPreferences(workflowDto.preferences.user) : null,
      defaultPreferences: buildWorkflowPreferences(workflowDto.preferences?.workflow),
      triggerIdentifier: preserveWorkflowId ? workflowDto.workflowId : slugifyOrRandom(workflowDto.name),
      status: computeWorkflowStatus(isWorkflowActive, steps),
      payloadSchema: workflowDto.payloadSchema,
      validatePayload: workflowDto.validatePayload,
      isTranslationEnabled: workflowDto.isTranslationEnabled,
      severity: workflowDto.severity,
      agent: workflowDto.agent,
    };
  }

  @Instrument()
  private async buildUpdateWorkflowCommand(
    command: UpsertWorkflowCommand,
    existingWorkflow: NotificationTemplateEntity
  ): Promise<UpdateWorkflowCommandV0> {
    const { workflowDto, user } = command;
    const steps = await this.buildSteps(command, existingWorkflow);
    const workflowActive = workflowDto.active ?? true;

    return {
      id: existingWorkflow._id,
      environmentId: existingWorkflow._environmentId,
      updatedBy: user._id,
      organizationId: user.organizationId,
      userId: user._id,
      name: workflowDto.name,
      steps,
      rawData: workflowDto as unknown as Record<string, unknown>,
      type: ResourceTypeEnum.BRIDGE,
      description: workflowDto.description,
      userPreferences: workflowDto.preferences?.user ? buildWorkflowPreferences(workflowDto.preferences.user) : null,
      defaultPreferences: buildWorkflowPreferences(workflowDto.preferences?.workflow),
      tags: workflowDto.tags,
      active: workflowActive,
      payloadSchema: workflowDto.payloadSchema,
      validatePayload: workflowDto.validatePayload,
      isTranslationEnabled: workflowDto.isTranslationEnabled,
      severity: workflowDto.severity,
      agent: workflowDto.agent,
    };
  }

  @Instrument()
  private async buildSteps(
    command: UpsertWorkflowCommand,
    existingWorkflow?: NotificationTemplateEntity
  ): Promise<NotificationStep[]> {
    const { user } = command;
    const workflowOrigin = command.workflowDto.origin ?? ResourceOriginEnum.NOVU_CLOUD;

    let preloadedControlValues: ControlValuesEntity[] | undefined;
    if (existingWorkflow) {
      preloadedControlValues = await this.controlValuesRepository.find(
        {
          _environmentId: user.environmentId,
          _organizationId: user.organizationId,
          _workflowId: existingWorkflow._id,
          level: {
            $in: [ControlValuesLevelEnum.STEP_CONTROLS, ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS],
          },
          controls: { $ne: null },
        },
        {
          controls: 1,
          _stepId: 1,
          level: 1,
          providerId: 1,
          _id: 0,
        }
      );
    }

    const tempSteps: NotificationStep[] = [];
    const stepIds: string[] = [];

    for (const step of command.workflowDto.steps) {
      const existingStep: NotificationStepEntity | null | undefined =
        '_id' in step ? existingWorkflow?.steps.find((s) => !!step._id && s._templateId === step._id) : null;

      const updateStepId = existingStep?.stepId;
      const syncToEnvironmentCreateStepId = step.stepId;
      const generatedStepId =
        updateStepId ||
        syncToEnvironmentCreateStepId ||
        this.generateUniqueStepId(step, existingWorkflow ? existingWorkflow.steps : tempSteps);

      stepIds.push(generatedStepId);
      tempSteps.push({ stepId: generatedStepId } as NotificationStep);
    }

    const optimisticSteps = command.workflowDto.steps.map((step, index) => ({
      stepId: stepIds[index],
      type: step.type,
      ...(step.controlValues ? { controlValues: step.controlValues } : {}),
      ...(step._id ? { _id: step._id } : {}),
    }));

    const optimisticPayloadSchema = command.workflowDto.payloadSchema as JSONSchemaDto | undefined;

    const stepsWithIssues = await Promise.all(
      command.workflowDto.steps.map(async (step, index) => {
        const existingStep: NotificationStepEntity | null | undefined =
          '_id' in step ? existingWorkflow?.steps.find((s) => !!step._id && s._templateId === step._id) : null;

        const controlSchemas: ControlSchemas = resolveStepControlSchemas({
          stepType: step.type,
          workflowOrigin,
          existingControls: existingStep?.template?.controls,
          stepResolverHash: existingStep?.template?.stepResolverHash,
        });
        const issues: StepIssuesDto = await this.buildStepIssuesUsecase.execute({
          workflowOrigin,
          user,
          stepInternalId: existingStep?._id,
          workflow: existingWorkflow,
          stepType: step.type,
          controlSchema: controlSchemas.schema,
          controlsDto: step.controlValues,
          providerOverridesDto: step.providerOverrides,
          optimisticSteps,
          preloadedControlValues,
          optimisticPayloadSchema,
        });

        const finalStep = {
          template: {
            type: step.type,
            name: step.name,
            controls: controlSchemas,
            content: '',
          },
          stepId: stepIds[index],
          name: step.name,
          issues,
        };

        if (existingStep) {
          Object.assign(finalStep, {
            _id: existingStep._templateId,
            _templateId: existingStep._templateId,
            template: { ...finalStep.template, _id: existingStep._templateId },
          });
        }

        return finalStep;
      })
    );

    return stepsWithIssues;
  }

  @Instrument()
  private generateUniqueStepId(step: UpsertStepDataCommand, previousSteps: NotificationStep[]): string {
    const slug = slugifyOrRandom(step.name);

    let finalStepId = slug;
    let attempts = 0;
    const maxAttempts = 5;

    const previousStepIds = previousSteps.reduce<string[]>((acc, { stepId }) => {
      if (stepId) {
        acc.push(stepId);
      }

      return acc;
    }, []);

    const isStepIdUnique = (stepId: string) => !previousStepIds.includes(stepId);

    while (attempts < maxAttempts) {
      if (isStepIdUnique(finalStepId)) {
        break;
      }

      finalStepId = `${slug}-${shortId()}`;
      attempts += 1;
    }

    if (attempts === maxAttempts && !isStepIdUnique(finalStepId)) {
      throw new BadRequestException({
        message: 'Failed to generate unique stepId',
        stepId: finalStepId,
      });
    }

    return finalStepId;
  }

  private async getNotificationGroup(
    environmentId: string,
    session?: ClientSession | null
  ): Promise<string | undefined> {
    return (
      await this.notificationGroupRepository.findOne(
        {
          name: 'General',
          _environmentId: environmentId,
        },
        '_id',
        { session }
      )
    )?._id;
  }

  @Instrument()
  private async upsertControlValues(
    updatedWorkflow: NotificationTemplateEntity,
    command: UpsertWorkflowCommand
  ): Promise<void> {
    const controlValuesUpdates = this.getControlValuesUpdates(updatedWorkflow.steps, command);
    const providerOverrideUpdates = this.getProviderOverrideUpdates(updatedWorkflow.steps, command);

    await Promise.all([
      ...controlValuesUpdates.map((update) => this.executeControlValuesUpdate(update, updatedWorkflow._id, command)),
      ...providerOverrideUpdates.map((update) =>
        this.executeProviderOverridesUpdate(update, updatedWorkflow._id, command)
      ),
    ]);
  }

  @Instrument()
  private getControlValuesUpdates(updatedSteps: NotificationStepEntity[], command: UpsertWorkflowCommand) {
    return updatedSteps
      .map((step) => {
        const controlValues = this.findControlValueInRequest(step, command.workflowDto.steps);
        if (controlValues === undefined) return null;

        return {
          step,
          controlValues,
          shouldDelete: controlValues === null,
        };
      })
      .filter((update): update is NonNullable<typeof update> => update !== null);
  }

  @Instrument()
  private getProviderOverrideUpdates(updatedSteps: NotificationStepEntity[], command: UpsertWorkflowCommand) {
    return updatedSteps
      .map((step) => {
        const providerOverrides = this.findProviderOverridesInRequest(step, command.workflowDto.steps);
        if (providerOverrides === undefined) return null;

        return {
          step,
          providerOverrides,
          shouldDelete: providerOverrides === null,
        };
      })
      .filter((update): update is NonNullable<typeof update> => update !== null);
  }

  @Instrument()
  private async executeControlValuesUpdate(
    {
      shouldDelete,
      step,
      controlValues,
    }: { step: NotificationStepEntity; controlValues: Record<string, unknown> | null; shouldDelete: boolean },
    workflowId: string,
    command: UpsertWorkflowCommand
  ) {
    if (shouldDelete) {
      // Cascade-delete main step controls and any per-provider override docs for the step.
      return this.controlValuesRepository.deleteMany(
        {
          _environmentId: command.user.environmentId,
          _organizationId: command.user.organizationId,
          _workflowId: workflowId,
          _stepId: step._templateId,
          level: {
            $in: [ControlValuesLevelEnum.STEP_CONTROLS, ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS],
          },
        },
        { session: command.session }
      );
    }

    // providerOverrides is persisted as STEP_PROVIDER_CONTROLS docs — never nest in main controls.
    const { providerOverrides: _ignoredProviderOverrides, ...controlValuesWithoutProviderOverrides } = (controlValues ||
      {}) as Record<string, unknown> & { providerOverrides?: unknown };
    const newControlValues = controlValuesWithoutProviderOverrides;

    /*
     * Only apply email-specific processing for NOVU_CLOUD workflows
     * For EXTERNAL workflows, preserve all custom fields as-is
     */
    if (
      step.template?.type === StepTypeEnum.EMAIL &&
      (command.workflowDto.origin === ResourceOriginEnum.NOVU_CLOUD ||
        command.workflowDto.origin === ResourceOriginEnum.NOVU_CLOUD_V1)
    ) {
      const emailControlValues = newControlValues as EmailControlType;
      const shouldApplyStandardEmailProcessing = !isStepResolverActive(step.template?.stepResolverHash);

      if (shouldApplyStandardEmailProcessing && typeof emailControlValues.layoutId === 'string') {
        const layout = await this.getLayoutUseCase.execute(
          GetLayoutCommand.create({
            layoutIdOrInternalId: emailControlValues.layoutId,
            environmentId: command.user.environmentId,
            organizationId: command.user.organizationId,
            userId: command.user._id,
            skipAdditionalFields: true,
          })
        );
        emailControlValues.layoutId = layout.layoutId;
      }

      if (shouldApplyStandardEmailProcessing) {
        const isMaily = isStringifiedMailyJSONContent(emailControlValues.body);
        if (emailControlValues.editorType === 'html' && isMaily) {
          const { result } = await this.previewUsecase.execute(
            PreviewCommand.create({
              user: command.user,
              workflowIdOrInternalId: workflowId,
              stepIdOrInternalId: step._id ?? step.stepId ?? '',
              generatePreviewRequestDto: {
                controlValues: emailControlValues,
              },
              skipLayoutRendering: true,
            })
          );
          let htmlBody = removeBrandingFromHtml((result.preview as EmailRenderOutput).body ?? '');
          try {
            htmlBody = await format(htmlBody, {
              parser: 'html',
              printWidth: 120,
              tabWidth: 2,
              useTabs: false,
              htmlWhitespaceSensitivity: 'css',
            });
          } catch (error) {
            this.logger.warn({ err: error }, 'Failed to prettify HTML');
          }

          emailControlValues.body = htmlBody;
        } else if (emailControlValues.editorType === 'block' && !isMaily) {
          emailControlValues.body = '';
        }
      }
    }

    if (
      step.template?.type === StepTypeEnum.CHAT &&
      (command.workflowDto.origin === ResourceOriginEnum.NOVU_CLOUD ||
        command.workflowDto.origin === ResourceOriginEnum.NOVU_CLOUD_V1) &&
      !isStepResolverActive(step.template?.stepResolverHash)
    ) {
      const chatControlValues = newControlValues as ChatControlType;
      const resolvedEditorType = resolveChatEditorType(chatControlValues.body, chatControlValues.editorType);

      if (resolvedEditorType) {
        chatControlValues.editorType = resolvedEditorType;
      } else {
        delete chatControlValues.editorType;
      }
    }

    return this.upsertControlValuesUseCase.execute(
      UpsertControlValuesCommand.create({
        organizationId: command.user.organizationId,
        environmentId: command.user.environmentId,
        stepId: step._templateId,
        workflowId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        newControlValues,
        session: command.session,
      })
    );
  }

  @Instrument()
  private async executeProviderOverridesUpdate(
    {
      shouldDelete,
      step,
      providerOverrides,
    }: {
      step: NotificationStepEntity;
      providerOverrides: StepProviderOverrides | null;
      shouldDelete: boolean;
    },
    workflowId: string,
    command: UpsertWorkflowCommand
  ) {
    const baseQuery = {
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
      _workflowId: workflowId,
      _stepId: step._templateId,
      level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
    };

    if (shouldDelete || providerOverrides === null) {
      return this.controlValuesRepository.deleteMany(baseQuery, { session: command.session });
    }

    const desiredProviderIds = Object.keys(providerOverrides).filter(isSupportedProviderOverrideId);

    const existingDocs = await this.controlValuesRepository.find(
      baseQuery,
      {
        providerId: 1,
        _id: 1,
      },
      { session: command.session }
    );
    const existingProviderIds = existingDocs
      .map((doc) => doc.providerId)
      .filter((id): id is string => typeof id === 'string');
    const desiredProviderIdSet = new Set<string>(desiredProviderIds);
    const providerIdsToDelete = existingProviderIds.filter((id) => !desiredProviderIdSet.has(id));

    if (providerIdsToDelete.length > 0) {
      await this.controlValuesRepository.deleteMany(
        {
          ...baseQuery,
          providerId: { $in: providerIdsToDelete },
        },
        { session: command.session }
      );
    }

    await Promise.all(
      desiredProviderIds.map((providerId) =>
        this.upsertControlValuesUseCase.execute(
          UpsertControlValuesCommand.create({
            organizationId: command.user.organizationId,
            environmentId: command.user.environmentId,
            stepId: step._templateId,
            workflowId,
            level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
            providerId,
            newControlValues: providerOverrides[providerId] ?? {},
            session: command.session,
          })
        )
      )
    );
  }

  private findMatchingCommandStep(
    updatedStep: NotificationStepEntity,
    commandSteps: UpsertStepDataCommand[]
  ): UpsertStepDataCommand | undefined {
    return commandSteps.find((commandStepX) => {
      const isStepUpdateDashboardDto = '_id' in commandStepX;
      if (isStepUpdateDashboardDto) {
        return commandStepX._id === updatedStep._templateId;
      }

      const isCreateBySyncToEnvironment = 'stepId' in commandStepX;
      if (isCreateBySyncToEnvironment) {
        return commandStepX.stepId === updatedStep.stepId;
      }

      return commandStepX.name === updatedStep.name;
    });
  }

  @Instrument()
  private findControlValueInRequest(
    updatedStep: NotificationStepEntity,
    commandSteps: UpsertStepDataCommand[]
  ): Record<string, unknown> | undefined | null {
    const commandStep = this.findMatchingCommandStep(updatedStep, commandSteps);

    if (!commandStep) return null;

    return commandStep.controlValues;
  }

  @Instrument()
  private findProviderOverridesInRequest(
    updatedStep: NotificationStepEntity,
    commandSteps: UpsertStepDataCommand[]
  ): StepProviderOverrides | undefined | null {
    const commandStep = this.findMatchingCommandStep(updatedStep, commandSteps);

    // Omit (undefined) when the step is absent from the request — do not treat as delete-all.
    if (!commandStep) return undefined;

    return commandStep.providerOverrides;
  }

  private mixpanelTrack(command: UpsertWorkflowCommand, eventName: string) {
    this.analyticsService.mixpanelTrack(eventName, command.user?._id, {
      _organization: command.user.organizationId,
      name: command.workflowDto.name,
      tags: command.workflowDto.tags || [],
      origin: command.workflowDto.origin,
      source: command.workflowDto.__source,
    });
  }
}
