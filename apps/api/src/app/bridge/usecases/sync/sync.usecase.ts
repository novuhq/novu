import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  BuildStepIssuesUsecase,
  CreateWorkflowCommandV0,
  CreateWorkflowV0,
  computeWorkflowStatus,
  ExecuteBridgeRequest,
  JSONSchema,
  JSONSchemaDto,
  NotificationStep,
  StepIssuesDto,
  UpdateWorkflowCommandV0,
  UpdateWorkflowV0,
} from '@novu/application-generic';
import {
  ControlValuesEntity,
  ControlValuesRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  NotificationGroupRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import { DiscoverOutput, DiscoverStepOutput, DiscoverWorkflowOutput, GetActionEnum } from '@novu/framework/internal';
import {
  buildWorkflowPreferences,
  ControlValuesLevelEnum,
  ResourceOriginEnum,
  ResourceTypeEnum,
  SeverityLevelEnum,
  StepTypeEnum,
  UserSessionData,
  WorkflowCreationSourceEnum,
  WorkflowPreferences,
} from '@novu/shared';
import { DeleteWorkflowCommand } from '../../../workflows-v1/usecases/delete-workflow/delete-workflow.command';
import { DeleteWorkflowUseCase } from '../../../workflows-v1/usecases/delete-workflow/delete-workflow.usecase';
import { CreateBridgeResponseDto } from '../../dtos/create-bridge-response.dto';
import { SyncCommand } from './sync.command';

@Injectable()
export class Sync {
  constructor(
    private createWorkflowUsecase: CreateWorkflowV0,
    private updateWorkflowUsecase: UpdateWorkflowV0,
    private deleteWorkflowUseCase: DeleteWorkflowUseCase,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private environmentRepository: EnvironmentRepository,
    private executeBridgeRequest: ExecuteBridgeRequest,
    private buildStepIssuesUsecase: BuildStepIssuesUsecase,
    private analyticsService: AnalyticsService,
    private controlValuesRepository: ControlValuesRepository
  ) {}
  async execute(command: SyncCommand): Promise<CreateBridgeResponseDto> {
    const environment = await this.findEnvironment(command);
    const discover = await this.executeDiscover(command);
    this.sendAnalytics(command, environment, discover);
    const persistedWorkflowsInBridge = await this.processWorkflows(command, discover.workflows);

    await this.disposeOldWorkflows(command, persistedWorkflowsInBridge);
    await this.updateBridgeUrl(command);

    return persistedWorkflowsInBridge;
  }

  private sendAnalytics(command: SyncCommand, environment: EnvironmentEntity, discover: DiscoverOutput) {
    if (command.source !== 'sample-workspace') {
      this.analyticsService.track('Sync Request - [Bridge API]', command.userId, {
        _organization: command.organizationId,
        _environment: command.environmentId,
        environmentName: environment.name,
        workflowsCount: discover.workflows?.length || 0,
        localEnvironment: !!command.bridgeUrl?.includes('novu.sh'),
        source: command.source,
      });
    }
  }

  private async executeDiscover(command: SyncCommand): Promise<DiscoverOutput> {
    let discover: DiscoverOutput | undefined;
    try {
      discover = (await this.executeBridgeRequest.execute({
        statelessBridgeUrl: command.bridgeUrl,
        environmentId: command.environmentId,
        action: GetActionEnum.DISCOVER,
        retriesLimit: 1,
        workflowOrigin: ResourceOriginEnum.EXTERNAL,
      })) as DiscoverOutput;
    } catch (error) {
      if (error instanceof HttpException) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    if (!discover) {
      throw new BadRequestException('Invalid Bridge URL Response');
    }

    return discover;
  }

  private async findEnvironment(command: SyncCommand): Promise<EnvironmentEntity> {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }

    return environment;
  }

  private async updateBridgeUrl(command: SyncCommand): Promise<void> {
    await this.environmentRepository.update(
      { _id: command.environmentId },
      {
        $set: {
          echo: {
            url: command.bridgeUrl,
          },
          bridge: {
            url: command.bridgeUrl,
          },
        },
      }
    );
  }

  private async disposeOldWorkflows(
    command: SyncCommand,
    createdWorkflows: NotificationTemplateEntity[]
  ): Promise<void> {
    const persistedWorkflowIdsInBridge = createdWorkflows.map((i) => i._id);
    const workflowsToDelete = await this.findAllWorkflowsWithOtherIds(command, persistedWorkflowIdsInBridge);
    const deleteWorkflowFromStoragePromises = workflowsToDelete.map((workflow) =>
      this.deleteWorkflowUseCase.execute(
        DeleteWorkflowCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          workflowIdOrInternalId: workflow._id,
        })
      )
    );

    await Promise.all([...deleteWorkflowFromStoragePromises]);
  }

  private async findAllWorkflowsWithOtherIds(
    command: SyncCommand,
    persistedWorkflowIdsInBridge: string[]
  ): Promise<NotificationTemplateEntity[]> {
    return await this.notificationTemplateRepository.find({
      _environmentId: command.environmentId,
      type: {
        $in: [ResourceTypeEnum.ECHO, ResourceTypeEnum.BRIDGE],
      },
      origin: {
        $in: [ResourceOriginEnum.EXTERNAL, undefined, null],
      },
      _id: { $nin: persistedWorkflowIdsInBridge },
    });
  }

  private async processWorkflows(
    command: SyncCommand,
    workflowsFromBridge: DiscoverWorkflowOutput[]
  ): Promise<NotificationTemplateEntity[]> {
    const identifiers = workflowsFromBridge.map((w) => w.workflowId);
    const bulkResults = await this.notificationTemplateRepository.findByTriggerIdentifierBulk(
      command.environmentId,
      identifiers
    );
    const existingFrameworkWorkflows = workflowsFromBridge.map(
      (workflow) => bulkResults.find((r) => r.triggers.some((t) => t.identifier === workflow.workflowId)) ?? null
    );

    existingFrameworkWorkflows.forEach((workflow, index) => {
      if (workflow?.origin && workflow.origin !== ResourceOriginEnum.EXTERNAL) {
        const { workflowId } = workflowsFromBridge[index];
        throw new BadRequestException(
          `Workflow ${workflowId} was already created in Dashboard. Please use another workflowId.`
        );
      }
    });

    return Promise.all(
      workflowsFromBridge.map(async (workflow, index) => {
        const existingFrameworkWorkflow = existingFrameworkWorkflows[index];

        return await this.upsertWorkflow(command, workflow, existingFrameworkWorkflow);
      })
    );
  }

  private async upsertWorkflow(
    command: SyncCommand,
    workflow: DiscoverWorkflowOutput,
    existingFrameworkWorkflow: NotificationTemplateEntity | null
  ): Promise<NotificationTemplateEntity> {
    if (existingFrameworkWorkflow) {
      return await this.updateWorkflowUsecase.execute(
        UpdateWorkflowCommandV0.create(
          await this.mapDiscoverWorkflowToUpdateWorkflowCommand(existingFrameworkWorkflow, command, workflow)
        )
      );
    }

    return await this.createWorkflow(command, workflow);
  }

  private async createWorkflow(
    command: SyncCommand,
    workflow: DiscoverWorkflowOutput
  ): Promise<NotificationTemplateEntity> {
    const notificationGroupId = await this.getNotificationGroup(
      this.castToAnyNotSupportedParam(workflow)?.notificationGroupId,
      command.environmentId
    );

    if (!notificationGroupId) {
      throw new BadRequestException('Notification group not found');
    }
    const steps = await this.mapSteps(command, workflow.steps);
    const workflowActive = this.castToAnyNotSupportedParam(workflow)?.active ?? true;

    return await this.createWorkflowUsecase.execute(
      CreateWorkflowCommandV0.create({
        origin: ResourceOriginEnum.EXTERNAL,
        type: ResourceTypeEnum.BRIDGE,
        notificationGroupId,
        draft: workflowActive,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        name: this.getWorkflowName(workflow),
        triggerIdentifier: workflow.workflowId,
        __source: WorkflowCreationSourceEnum.BRIDGE,
        steps,
        controls: {
          schema: workflow.controls?.schema as unknown as JSONSchema,
        },
        rawData: this.buildRawData(workflow),
        payloadSchema: workflow.payload?.schema as unknown as JSONSchema,
        active: workflowActive,
        status: computeWorkflowStatus(workflowActive, steps),
        description: this.getWorkflowDescription(workflow),
        severity: workflow.severity || SeverityLevelEnum.NONE,
        data: this.castToAnyNotSupportedParam(workflow)?.data,
        tags: this.getWorkflowTags(workflow),
        defaultPreferences: this.getWorkflowPreferences(workflow),
      })
    );
  }

  private async mapDiscoverWorkflowToUpdateWorkflowCommand(
    workflowExist: NotificationTemplateEntity,
    command: SyncCommand,
    workflow: DiscoverWorkflowOutput
  ): Promise<UpdateWorkflowCommandV0> {
    const steps = await this.mapSteps(command, workflow.steps, workflowExist);
    const workflowActive = this.castToAnyNotSupportedParam(workflow)?.active ?? true;

    return {
      id: workflowExist._id,
      existingWorkflow: workflowExist,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      userId: command.userId,
      name: this.getWorkflowName(workflow),
      workflowId: workflow.workflowId,
      steps,
      controls: {
        schema: workflow.controls?.schema as unknown as JSONSchemaDto,
      },
      rawData: this.buildRawData(workflow),
      payloadSchema: workflow.payload?.schema as unknown as JSONSchemaDto,
      type: ResourceTypeEnum.BRIDGE,
      description: this.getWorkflowDescription(workflow),
      data: this.castToAnyNotSupportedParam(workflow)?.data,
      tags: this.getWorkflowTags(workflow),
      active: workflowActive,
      defaultPreferences: this.getWorkflowPreferences(workflow),
    };
  }

  private async mapSteps(
    command: SyncCommand,
    commandWorkflowSteps: DiscoverStepOutput[],
    workflow?: NotificationTemplateEntity | undefined
  ): Promise<NotificationStep[]> {
    let preloadedControlValues: ControlValuesEntity[] | undefined;

    if (workflow?._id) {
      preloadedControlValues = await this.controlValuesRepository.find({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _workflowId: workflow._id,
        level: ControlValuesLevelEnum.STEP_CONTROLS,
      });
    }

    return Promise.all(
      commandWorkflowSteps.map(async (step: DiscoverStepOutput) => {
        const foundStep = workflow?.steps?.find((workflowStep) => workflowStep.stepId === step.stepId);

        const issues: StepIssuesDto = await this.buildStepIssuesUsecase.execute({
          workflowOrigin: ResourceOriginEnum.EXTERNAL,
          user: {
            _id: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
          } as UserSessionData,
          stepInternalId: foundStep?._id,
          workflow,
          stepType: step.type as StepTypeEnum,
          controlSchema: step.controls?.schema as unknown as JSONSchemaDto,
          ...(preloadedControlValues ? { preloadedControlValues } : {}),
        });

        const template = {
          _id: foundStep?._id,
          type: step.type,
          name: step.stepId,
          controls: step.controls,
          output: step.outputs,
          options: step.options,
          code: step.code,
        };

        return {
          template,
          name: step.stepId,
          stepId: step.stepId,
          uuid: step.stepId,
          _templateId: foundStep?._templateId,
          shouldStopOnFail: this.castToAnyNotSupportedParam(step.options)?.failOnErrorEnabled ?? false,
          issues,
        };
      })
    );
  }

  private async getNotificationGroup(
    notificationGroupIdCommand: string | undefined,
    environmentId: string
  ): Promise<string | undefined> {
    let notificationGroupId = notificationGroupIdCommand;

    if (!notificationGroupId) {
      notificationGroupId = (
        await this.notificationGroupRepository.findOne(
          {
            name: 'General',
            _environmentId: environmentId,
          },
          '_id'
        )
      )?._id;
    }

    return notificationGroupId;
  }

  private getWorkflowPreferences(workflow: DiscoverWorkflowOutput): WorkflowPreferences {
    return buildWorkflowPreferences(workflow.preferences || {});
  }

  private getWorkflowName(workflow: DiscoverWorkflowOutput): string {
    return workflow.name || workflow.workflowId;
  }

  private getWorkflowDescription(workflow: DiscoverWorkflowOutput): string {
    return workflow.description || '';
  }

  private getWorkflowTags(workflow: DiscoverWorkflowOutput): string[] {
    return workflow.tags || [];
  }

  private buildRawData(workflow: DiscoverWorkflowOutput): Record<string, unknown> {
    const rawData = { ...workflow } as Record<string, unknown>;

    if (rawData.payload && typeof rawData.payload === 'object') {
      const { unknownSchema: _payloadUnknownSchema, ...payloadRest } = rawData.payload as Record<string, unknown>;
      rawData.payload = payloadRest;
    }

    if (rawData.controls && typeof rawData.controls === 'object') {
      const { unknownSchema: _controlsUnknownSchema, ...controlsRest } = rawData.controls as Record<string, unknown>;
      rawData.controls = controlsRest;
    }

    return rawData;
  }

  private castToAnyNotSupportedParam(param: any): any {
    return param as any;
  }
}
