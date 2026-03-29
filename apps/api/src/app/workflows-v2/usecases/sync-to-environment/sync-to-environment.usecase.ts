import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  FeatureFlagsService,
  GetWorkflowCommand,
  GetWorkflowUseCase,
  Instrument,
  InstrumentUsecase,
  SendWebhookMessage,
  StepResponseDto,
  UpsertStepDataCommand,
  UpsertWorkflowCommand,
  UpsertWorkflowDataCommand,
  UpsertWorkflowUseCase,
  WorkflowPreferencesDto,
  WorkflowResponseDto,
} from '@novu/application-generic';
import {
  BaseRepository,
  ClientSession,
  EnvironmentRepository,
  LocalizationResourceEnum,
  NotificationTemplateRepository,
  PreferencesEntity,
  PreferencesRepository,
} from '@novu/dal';
import {
  FeatureFlagsKeysEnum,
  PreferencesTypeEnum,
  ResourceOriginEnum,
  StepTypeEnum,
  WebhookEventEnum,
  WebhookObjectTypeEnum,
  WorkflowCreationSourceEnum,
} from '@novu/shared';
import {
  LayoutSyncToEnvironmentCommand,
  LayoutSyncToEnvironmentUseCase,
} from '../../../layouts-v2/usecases/sync-to-environment';
import {
  SyncStepResolverToEnvironmentCommand,
  SyncStepResolverToEnvironmentUsecase,
} from '../../../step-resolvers/usecases/sync-step-resolver-to-environment';
import { WorkflowNotSyncableException } from '../../exceptions/workflow-not-syncable-exception';
import { SyncToEnvironmentCommand } from './sync-to-environment.command';

export const SYNCABLE_WORKFLOW_ORIGINS = [ResourceOriginEnum.NOVU_CLOUD];

/**
 * This usecase is used to sync a workflow from one environment to another.
 * It will create a new workflow in the target environment if it doesn't exist, or update it if it does.
 * The cloning of the workflow to the target environment includes:
 * - the workflow (NotificationTemplateEntity) + steps
 * - the preferences (PreferencesEntity)
 * - the control values (ControlValuesEntity)
 * - the message template (MessageTemplateEntity)
 * - the payload schema and validation settings
 */
@Injectable()
export class SyncToEnvironmentUseCase {
  constructor(
    private getWorkflowUseCase: GetWorkflowUseCase,
    private preferencesRepository: PreferencesRepository,
    private upsertWorkflowUseCase: UpsertWorkflowUseCase,
    private layoutSyncToEnvironmentUseCase: LayoutSyncToEnvironmentUseCase,
    private syncStepResolverToEnvironmentUsecase: SyncStepResolverToEnvironmentUsecase,
    private featureFlagsService: FeatureFlagsService,
    private moduleRef: ModuleRef,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private environmentRepository: EnvironmentRepository,
    @Optional()
    private sendWebhookMessage?: SendWebhookMessage
  ) {}

  @InstrumentUsecase()
  async execute(command: SyncToEnvironmentCommand): Promise<WorkflowResponseDto> {
    if (command.user.environmentId === command.targetEnvironmentId) {
      throw new BadRequestException('Cannot sync workflow to the same environment');
    }

    await this.validateTargetEnvironment(command.targetEnvironmentId, command.user.organizationId);

    const sourceWorkflow = await this.getWorkflowUseCase.execute(
      GetWorkflowCommand.create({
        user: command.user,
        workflowIdOrInternalId: command.workflowIdOrInternalId,
      })
    );

    if (!this.isSyncable(sourceWorkflow)) {
      throw new WorkflowNotSyncableException(sourceWorkflow);
    }

    const preferencesToClone = await this.getWorkflowPreferences(
      sourceWorkflow._id,
      command.user.environmentId,
      command.session
    );
    const externalId = sourceWorkflow.workflowId;
    const targetWorkflow = await this.findWorkflowInTargetEnvironment(command, externalId);
    const workflowDto = await this.buildRequestDto(sourceWorkflow, preferencesToClone, targetWorkflow);

    const layoutsToSync: string[] = [];
    for (const step of workflowDto.steps) {
      if (step.type === StepTypeEnum.EMAIL && step.controlValues?.layoutId) {
        const layoutId = step.controlValues?.layoutId as string;
        layoutsToSync.push(layoutId);
      }
    }

    const layoutsToSyncPromises = layoutsToSync.map((layoutId) =>
      this.layoutSyncToEnvironmentUseCase.execute(
        LayoutSyncToEnvironmentCommand.create({
          user: command.user,
          layoutIdOrInternalId: layoutId,
          targetEnvironmentId: command.targetEnvironmentId,
        })
      )
    );
    await Promise.all(layoutsToSyncPromises);

    const layoutsTranslationGroupsPromises = layoutsToSync.map((layoutId) =>
      this.publishTranslationGroup(layoutId, LocalizationResourceEnum.LAYOUT, command)
    );
    await Promise.all(layoutsTranslationGroupsPromises);

    const upsertedWorkflow = await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        preserveWorkflowId: true,
        user: { ...command.user, environmentId: command.targetEnvironmentId },
        workflowIdOrInternalId: targetWorkflow?._id,
        workflowDto,
        session: command.session,
      })
    );

    await this.syncStepResolver(command, sourceWorkflow, upsertedWorkflow);

    await this.publishTranslationGroup(sourceWorkflow.workflowId, LocalizationResourceEnum.WORKFLOW, command);

    // Update the source workflow with publish information
    await this.notificationTemplateRepository.updatePublishFields(
      sourceWorkflow._id,
      command.user.environmentId,
      command.user._id,
      command.session
    );

    if (this.sendWebhookMessage) {
      await this.sendWebhookMessage.execute({
        eventType: WebhookEventEnum.WORKFLOW_PUBLISHED,
        objectType: WebhookObjectTypeEnum.WORKFLOW,
        payload: {
          object: upsertedWorkflow as unknown as Record<string, unknown>,
          previousObject: sourceWorkflow as unknown as Record<string, unknown>,
        },
        organizationId: command.user.organizationId,
        environmentId: command.user.environmentId,
      });
    }

    return upsertedWorkflow;
  }

  private async validateTargetEnvironment(targetEnvironmentId: string, organizationId: string): Promise<void> {
    if (!BaseRepository.isInternalId(targetEnvironmentId)) {
      throw new NotFoundException(`Environment ${targetEnvironmentId} not found`);
    }

    const environment = await this.environmentRepository.findByIdAndOrganization(targetEnvironmentId, organizationId);

    if (!environment) {
      throw new NotFoundException(`Environment ${targetEnvironmentId} not found`);
    }
  }

  @Instrument()
  private async syncStepResolver(
    command: SyncToEnvironmentCommand,
    sourceWorkflow: WorkflowResponseDto,
    upsertedWorkflow: WorkflowResponseDto
  ): Promise<void> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED,
      defaultValue: false,
      organization: { _id: command.user.organizationId },
    });

    if (!isEnabled) return;

    await this.syncStepResolverToEnvironmentUsecase.execute(
      SyncStepResolverToEnvironmentCommand.create({
        user: command.user,
        targetEnvironmentId: command.targetEnvironmentId,
        session: command.session,
        sourceSteps: sourceWorkflow.steps.map((step) => ({
          stepId: step.stepId,
          stepType: step.type,
          stepResolverHash: step.stepResolverHash,
          controlSchema: (step.controls?.dataSchema as Record<string, unknown>) ?? null,
        })),
        targetSteps: upsertedWorkflow.steps.map((step) => ({
          stepId: step.stepId,
          stepResolverHash: step.stepResolverHash,
          templateId: step._id,
        })),
      })
    );
  }

  private async publishTranslationGroup(
    resourceId: string,
    resourceType: LocalizationResourceEnum,
    command: SyncToEnvironmentCommand
  ): Promise<void> {
    const isEnterprise = process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true';
    const isSelfHosted = process.env.IS_SELF_HOSTED === 'true';

    if (!isEnterprise || isSelfHosted) {
      return;
    }

    const publishTranslationGroup = this.moduleRef.get(require('@novu/ee-translation')?.PublishTranslationGroup, {
      strict: false,
    });

    const { user, targetEnvironmentId } = command;

    await publishTranslationGroup.execute({
      user,
      resourceId,
      resourceType,
      sourceEnvironmentId: user.environmentId,
      targetEnvironmentId,
    });
  }

  private isSyncable(workflow: WorkflowResponseDto): boolean {
    return SYNCABLE_WORKFLOW_ORIGINS.includes(workflow.origin);
  }

  private async buildRequestDto(
    sourceWorkflow: WorkflowResponseDto,
    preferencesToClone: PreferencesEntity[],
    targetWorkflow?: WorkflowResponseDto
  ): Promise<UpsertWorkflowDataCommand> {
    if (targetWorkflow) {
      return await this.mapWorkflowToUpdateWorkflowDto(sourceWorkflow, targetWorkflow, preferencesToClone);
    }

    return await this.mapWorkflowToCreateWorkflowDto(sourceWorkflow, preferencesToClone);
  }

  @Instrument()
  private async findWorkflowInTargetEnvironment(
    command: SyncToEnvironmentCommand,
    externalId: string
  ): Promise<WorkflowResponseDto | undefined> {
    try {
      return await this.getWorkflowUseCase.execute(
        GetWorkflowCommand.create({
          user: { ...command.user, environmentId: command.targetEnvironmentId },
          workflowIdOrInternalId: externalId,
        })
      );
    } catch (error) {
      return undefined;
    }
  }

  private async mapWorkflowToCreateWorkflowDto(
    sourceWorkflow: WorkflowResponseDto,
    preferences: PreferencesEntity[]
  ): Promise<UpsertWorkflowDataCommand> {
    return {
      workflowId: sourceWorkflow.workflowId,
      payloadSchema: sourceWorkflow.payloadSchema || null,
      validatePayload: sourceWorkflow.validatePayload,
      isTranslationEnabled: sourceWorkflow.isTranslationEnabled,
      origin: ResourceOriginEnum.NOVU_CLOUD,
      name: sourceWorkflow.name,
      active: sourceWorkflow.active,
      tags: sourceWorkflow.tags,
      description: sourceWorkflow.description,
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      severity: sourceWorkflow.severity,
      steps: await this.mapStepsToCreateOrUpdateDto(sourceWorkflow.steps),
      preferences: this.mapPreferences(preferences),
    };
  }

  private async mapWorkflowToUpdateWorkflowDto(
    sourceWorkflow: WorkflowResponseDto,
    existingTargetEnvWorkflow: WorkflowResponseDto | undefined,
    preferencesToClone: PreferencesEntity[]
  ): Promise<UpsertWorkflowDataCommand> {
    return {
      origin: ResourceOriginEnum.NOVU_CLOUD,
      payloadSchema: sourceWorkflow.payloadSchema || null,
      validatePayload: sourceWorkflow.validatePayload,
      workflowId: sourceWorkflow.workflowId,
      isTranslationEnabled: sourceWorkflow.isTranslationEnabled,
      name: sourceWorkflow.name,
      active: sourceWorkflow.active,
      tags: sourceWorkflow.tags,
      description: sourceWorkflow.description,
      severity: sourceWorkflow.severity,
      steps: await this.mapStepsToCreateOrUpdateDto(sourceWorkflow.steps, existingTargetEnvWorkflow?.steps),
      preferences: this.mapPreferences(preferencesToClone),
    };
  }

  private async mapStepsToCreateOrUpdateDto(
    sourceSteps: StepResponseDto[],
    targetEnvSteps?: StepResponseDto[]
  ): Promise<UpsertStepDataCommand[]> {
    return sourceSteps.map((sourceStep) => {
      // if we find matching step in target environment, we are updating
      const targetStepInternalId = targetEnvSteps?.find((targetStep) => targetStep.stepId === sourceStep.stepId)?._id;

      return this.buildStepCreateOrUpdateDto(sourceStep, targetStepInternalId);
    });
  }

  private buildStepCreateOrUpdateDto(
    sourceStep: StepResponseDto,
    targetStepInternalId?: string
  ): UpsertStepDataCommand {
    return {
      ...(targetStepInternalId && { _id: targetStepInternalId }),
      stepId: sourceStep.stepId,
      name: sourceStep.name ?? '',
      type: sourceStep.type,
      controlValues: sourceStep.controls?.values ?? {},
    };
  }

  private mapPreferences(preferences: PreferencesEntity[]): {
    user: WorkflowPreferencesDto | null;
    workflow: WorkflowPreferencesDto | null;
  } {
    // we can typecast the preferences to WorkflowPreferences because user and workflow preferences are always full set
    return {
      user: preferences.find((pref) => pref.type === PreferencesTypeEnum.USER_WORKFLOW)
        ?.preferences as WorkflowPreferencesDto | null,
      workflow: preferences.find((pref) => pref.type === PreferencesTypeEnum.WORKFLOW_RESOURCE)
        ?.preferences as WorkflowPreferencesDto | null,
    };
  }

  private async getWorkflowPreferences(
    workflowId: string,
    environmentId: string,
    session?: ClientSession | null
  ): Promise<PreferencesEntity[]> {
    return await this.preferencesRepository.find(
      {
        _templateId: workflowId,
        _environmentId: environmentId,
        type: {
          $in: [PreferencesTypeEnum.WORKFLOW_RESOURCE, PreferencesTypeEnum.USER_WORKFLOW],
        },
      },
      '',
      { session }
    );
  }
}
