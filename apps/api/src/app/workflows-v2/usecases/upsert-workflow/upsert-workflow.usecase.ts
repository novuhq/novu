import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { format } from 'prettier';

import {
  AnalyticsService,
  GetWorkflowByIdsCommand,
  GetWorkflowByIdsUseCase,
  Instrument,
  InstrumentUsecase,
  NotificationStep,
  shortId,
  UpsertControlValuesCommand,
  UpsertControlValuesUseCase,
  SendWebhookMessage,
  EmailControlType,
  PinoLogger,
  FeatureFlagsService,
} from '@novu/application-generic';
import {
  ControlSchemas,
  ControlValuesRepository,
  NotificationGroupRepository,
  NotificationStepEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import {
  ControlValuesLevelEnum,
  DEFAULT_WORKFLOW_PREFERENCES,
  slugify,
  StepTypeEnum,
  WebhookEventEnum,
  WebhookObjectTypeEnum,
  WorkflowCreationSourceEnum,
  ResourceOriginEnum,
  ResourceTypeEnum,
  FeatureFlagsKeysEnum,
} from '@novu/shared';

import { stepTypeToControlSchema } from '../../shared';
import { computeWorkflowStatus } from '../../shared/compute-workflow-status';
import { BuildStepIssuesUsecase } from '../build-step-issues/build-step-issues.usecase';
import { GetWorkflowCommand, GetWorkflowUseCase } from '../get-workflow';
import { UpsertStepDataCommand, UpsertWorkflowCommand } from './upsert-workflow.command';
import { IOptimisticStepInfo } from '../build-variable-schema/build-available-variable-schema.command';
import { StepIssuesDto, WorkflowResponseDto } from '../../dtos';
import { isStringifiedMailyJSONContent } from '../../../shared/helpers/maily-utils';
import { PreviewUsecase } from '../preview/preview.usecase';
import { PreviewCommand } from '../preview';
import { EmailRenderOutput } from '../../dtos/generate-preview-response.dto';
import { removeBrandingFromHtml } from '../../../shared/utils/html';
import { GetLayoutCommand, GetLayoutUseCase } from '../../../layouts-v2/usecases/get-layout';
import { CreateWorkflow as CreateWorkflowV0Usecase } from '../../../workflows-v1/usecases/create-workflow/create-workflow.usecase';
import { CreateWorkflowCommand } from '../../../workflows-v1/usecases/create-workflow/create-workflow.command';
import { UpdateWorkflowCommand } from '../../../workflows-v1/usecases/update-workflow/update-workflow.command';
import { UpdateWorkflow as UpdateWorkflowV0Usecase } from '../../../workflows-v1/usecases/update-workflow/update-workflow.usecase';

@Injectable()
export class UpsertWorkflowUseCase {
  constructor(
    private createWorkflowV0Usecase: CreateWorkflowV0Usecase,
    private updateWorkflowV0Usecase: UpdateWorkflowV0Usecase,
    private notificationGroupRepository: NotificationGroupRepository,
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private getWorkflowUseCase: GetWorkflowUseCase,
    private buildStepIssuesUsecase: BuildStepIssuesUsecase,
    private controlValuesRepository: ControlValuesRepository,
    private upsertControlValuesUseCase: UpsertControlValuesUseCase,
    private previewUsecase: PreviewUsecase,
    private getLayoutUseCase: GetLayoutUseCase,
    private analyticsService: AnalyticsService,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger,
    @Optional()
    private sendWebhookMessage?: SendWebhookMessage
  ) {}

  @InstrumentUsecase()
  async execute(command: UpsertWorkflowCommand): Promise<WorkflowResponseDto> {
    // TODO: use transaction to ensure that the workflows, steps and controls are upserted atomically

    const existingWorkflow = command.workflowIdOrInternalId
      ? await this.getWorkflowByIdsUseCase.execute(
          GetWorkflowByIdsCommand.create({
            environmentId: command.user.environmentId,
            organizationId: command.user.organizationId,
            workflowIdOrInternalId: command.workflowIdOrInternalId,
          })
        )
      : null;

    let upsertedWorkflow: NotificationTemplateEntity;

    if (existingWorkflow) {
      this.mixpanelTrack(command, 'Workflow Update - [API]');

      upsertedWorkflow = await this.updateWorkflowV0Usecase.execute(
        UpdateWorkflowCommand.create(await this.buildUpdateWorkflowCommand(command, existingWorkflow))
      );
    } else {
      this.mixpanelTrack(command, 'Workflow Created - [API]');

      upsertedWorkflow = await this.createWorkflowV0Usecase.execute(
        CreateWorkflowCommand.create(await this.buildCreateWorkflowCommand(command))
      );
    }

    await this.upsertControlValues(upsertedWorkflow, command);

    const updatedWorkflow = await this.getWorkflowUseCase.execute(
      GetWorkflowCommand.create({
        workflowIdOrInternalId: upsertedWorkflow._id,
        user: command.user,
      })
    );

    if (this.sendWebhookMessage) {
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
    }

    return updatedWorkflow;
  }

  private async buildCreateWorkflowCommand(command: UpsertWorkflowCommand): Promise<CreateWorkflowCommand> {
    const { user, workflowDto, preserveWorkflowId } = command;
    const isWorkflowActive = workflowDto?.active ?? true;
    const notificationGroupId = await this.getNotificationGroup(command.user.environmentId);

    if (!notificationGroupId) {
      throw new BadRequestException('Notification group not found');
    }
    const steps = await this.buildSteps(command);

    return {
      notificationGroupId,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      userId: user._id,
      name: workflowDto.name,
      __source: workflowDto.__source || WorkflowCreationSourceEnum.DASHBOARD,
      type: ResourceTypeEnum.BRIDGE,
      origin: ResourceOriginEnum.NOVU_CLOUD,
      steps,
      active: isWorkflowActive,
      description: workflowDto.description || '',
      tags: workflowDto.tags || [],
      userPreferences: workflowDto.preferences?.user ?? null,
      defaultPreferences: workflowDto.preferences?.workflow ?? DEFAULT_WORKFLOW_PREFERENCES,
      triggerIdentifier: preserveWorkflowId ? workflowDto.workflowId : slugify(workflowDto.name),
      status: computeWorkflowStatus(isWorkflowActive, steps),
      payloadSchema: workflowDto.payloadSchema,
      validatePayload: workflowDto.validatePayload,
    };
  }

  private async buildUpdateWorkflowCommand(
    command: UpsertWorkflowCommand,
    existingWorkflow: NotificationTemplateEntity
  ): Promise<UpdateWorkflowCommand> {
    const { workflowDto, user } = command;
    const steps = await this.buildSteps(command, existingWorkflow);
    const workflowActive = workflowDto.active ?? true;

    return {
      id: existingWorkflow._id,
      environmentId: existingWorkflow._environmentId,
      organizationId: user.organizationId,
      userId: user._id,
      name: workflowDto.name,
      steps,
      rawData: workflowDto as unknown as Record<string, unknown>,
      type: ResourceTypeEnum.BRIDGE,
      description: workflowDto.description,
      userPreferences: workflowDto.preferences?.user ?? null,
      defaultPreferences: workflowDto.preferences?.workflow ?? DEFAULT_WORKFLOW_PREFERENCES,
      tags: workflowDto.tags,
      active: workflowActive,
      status: computeWorkflowStatus(workflowActive, steps),
      payloadSchema: workflowDto.payloadSchema,
      validatePayload: workflowDto.validatePayload,
    };
  }

  private async buildSteps(
    command: UpsertWorkflowCommand,
    existingWorkflow?: NotificationTemplateEntity
  ): Promise<NotificationStep[]> {
    const steps: NotificationStep[] = [];

    // Build optimistic step information for sync scenarios
    const optimisticSteps = command.workflowDto.steps.map((step) => ({
      stepId: step.stepId || this.generateUniqueStepId(step, command.workflowDto.steps),
      type: step.type,
    }));

    for (const step of command.workflowDto.steps) {
      const existingStep: NotificationStepEntity | null | undefined =
        // eslint-disable-next-line id-length
        '_id' in step ? existingWorkflow?.steps.find((s) => !!step._id && s._templateId === step._id) : null;

      const {
        user,
        workflowDto: { origin: workflowOrigin },
      } = command;

      const controlSchemas: ControlSchemas = existingStep?.template?.controls || stepTypeToControlSchema[step.type];
      const issues: StepIssuesDto = await this.buildStepIssuesUsecase.execute({
        workflowOrigin,
        user,
        stepInternalId: existingStep?._id,
        workflow: existingWorkflow,
        stepType: step.type,
        controlSchema: controlSchemas.schema,
        controlsDto: step.controlValues,
        optimisticSteps, // Pass optimistic steps for variable schema building
      });

      const updateStepId = existingStep?.stepId;
      const syncToEnvironmentCreateStepId = step.stepId;
      const finalStep = {
        template: {
          type: step.type,
          name: step.name,
          controls: controlSchemas,
          content: '',
        },
        stepId:
          updateStepId ||
          syncToEnvironmentCreateStepId ||
          this.generateUniqueStepId(step, existingWorkflow ? existingWorkflow.steps : command.workflowDto.steps),
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

      steps.push(finalStep);
    }

    return steps;
  }

  private generateUniqueStepId(step: UpsertStepDataCommand, previousSteps: NotificationStep[]): string {
    const slug = slugify(step.name);

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

  private async getNotificationGroup(environmentId: string): Promise<string | undefined> {
    return (
      await this.notificationGroupRepository.findOne(
        {
          name: 'General',
          _environmentId: environmentId,
        },
        '_id'
      )
    )?._id;
  }

  @Instrument()
  private async upsertControlValues(
    updatedWorkflow: NotificationTemplateEntity,
    command: UpsertWorkflowCommand
  ): Promise<void> {
    const controlValuesUpdates = this.getControlValuesUpdates(updatedWorkflow.steps, command);
    if (controlValuesUpdates.length === 0) return;

    await Promise.all(
      controlValuesUpdates.map((update) => this.executeControlValuesUpdate(update, updatedWorkflow._id, command))
    );
  }

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
      return this.controlValuesRepository.delete({
        _environmentId: command.user.environmentId,
        _organizationId: command.user.organizationId,
        _workflowId: workflowId,
        _stepId: step._templateId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
    }

    const newControlValues = controlValues || {};

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

      const isLayoutsPageActive = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_LAYOUTS_PAGE_ACTIVE,
        defaultValue: false,
        environment: { _id: command.user.environmentId },
        organization: { _id: command.user.organizationId },
      });

      // Assign default layoutId if null (but not if undefined)
      if (isLayoutsPageActive && emailControlValues.layoutId === null) {
        const defaultLayout = await this.getLayoutUseCase.execute(
          GetLayoutCommand.create({
            environmentId: command.user.environmentId,
            organizationId: command.user.organizationId,
            userId: command.user._id,
            skipAdditionalFields: true,
          })
        );
        emailControlValues.layoutId = defaultLayout.layoutId;
      } else if (isLayoutsPageActive && typeof emailControlValues.layoutId === 'string') {
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

    return this.upsertControlValuesUseCase.execute(
      UpsertControlValuesCommand.create({
        organizationId: command.user.organizationId,
        environmentId: command.user.environmentId,
        stepId: step._templateId,
        workflowId,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
        newControlValues,
      })
    );
  }

  private findControlValueInRequest(
    updatedStep: NotificationStepEntity,
    commandSteps: UpsertStepDataCommand[]
  ): Record<string, unknown> | undefined | null {
    const commandStep = commandSteps.find((commandStepX) => {
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

    if (!commandStep) return null;

    return commandStep.controlValues;
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
