import { BadRequestException, HttpException, Injectable } from '@nestjs/common';

import {
  EnvironmentEntity,
  EnvironmentRepository,
  NotificationGroupRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  AnalyticsService,
  CreateWorkflow,
  CreateWorkflowCommand,
  DeleteWorkflowCommand,
  DeleteWorkflowUseCase,
  ExecuteBridgeRequest,
  NotificationStep,
  UpdateWorkflow,
  UpdateWorkflowCommand,
} from '@novu/application-generic';
import {
  buildWorkflowPreferences,
  JSONSchemaDto,
  StepIssuesDto,
  StepTypeEnum,
  UserSessionData,
  WorkflowCreationSourceEnum,
  WorkflowOriginEnum,
  WorkflowPreferences,
  WorkflowTypeEnum,
} from '@novu/shared';
import { DiscoverOutput, DiscoverStepOutput, DiscoverWorkflowOutput, GetActionEnum } from '@novu/framework/internal';

import { SyncCommand } from './sync.command';
import { CreateBridgeResponseDto } from '../../dtos/create-bridge-response.dto';
import { BuildStepIssuesUsecase } from '../../../workflows-v2/usecases/build-step-issues/build-step-issues.usecase';
import { computeWorkflowStatus } from '../../../workflows-v2/shared/compute-workflow-status';

@Injectable()
export class Sync {
  constructor(
    private createWorkflowUsecase: CreateWorkflow,
    private updateWorkflowUsecase: UpdateWorkflow,
    private deleteWorkflowUseCase: DeleteWorkflowUseCase,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private environmentRepository: EnvironmentRepository,
    private executeBridgeRequest: ExecuteBridgeRequest,
    private buildStepIssuesUsecase: BuildStepIssuesUsecase,
    private analyticsService: AnalyticsService
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
        workflowOrigin: WorkflowOriginEnum.EXTERNAL,
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
        $in: [WorkflowTypeEnum.ECHO, WorkflowTypeEnum.BRIDGE],
      },
      origin: {
        $in: [WorkflowOriginEnum.EXTERNAL, undefined, null],
      },
      _id: { $nin: persistedWorkflowIdsInBridge },
    });
  }

  private async processWorkflows(
    command: SyncCommand,
    workflowsFromBridge: DiscoverWorkflowOutput[]
  ): Promise<NotificationTemplateEntity[]> {
    const existingFrameworkWorkflows = await Promise.all(
      workflowsFromBridge.map((workflow) =>
        this.notificationTemplateRepository.findByTriggerIdentifier(command.environmentId, workflow.workflowId)
      )
    );

    existingFrameworkWorkflows.forEach((workflow, index) => {
      if (workflow?.origin && workflow.origin !== WorkflowOriginEnum.EXTERNAL) {
        const { workflowId } = workflowsFromBridge[index];
        throw new BadRequestException(
          `Workflow ${workflowId} was already created in Dashboard. Please use another workflowId.`
        );
      }
    });

    return Promise.all(
      workflowsFromBridge.map(async (workflow, index) => {
        const existingFrameworkWorkflow = existingFrameworkWorkflows[index];
        const savedWorkflow = await this.upsertWorkflow(command, workflow, existingFrameworkWorkflow);

        return savedWorkflow;
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
        UpdateWorkflowCommand.create(
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
      CreateWorkflowCommand.create({
        origin: WorkflowOriginEnum.EXTERNAL,
        type: WorkflowTypeEnum.BRIDGE,
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
          schema: workflow.controls?.schema as JSONSchemaDto,
        },
        rawData: workflow as unknown as Record<string, unknown>,
        payloadSchema: workflow.payload?.schema as JSONSchemaDto,
        active: workflowActive,
        status: computeWorkflowStatus(workflowActive, steps),
        description: this.getWorkflowDescription(workflow),
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
  ): Promise<UpdateWorkflowCommand> {
    const steps = await this.mapSteps(command, workflow.steps, workflowExist);
    const workflowActive = this.castToAnyNotSupportedParam(workflow)?.active ?? true;

    return {
      id: workflowExist._id,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      userId: command.userId,
      name: this.getWorkflowName(workflow),
      workflowId: workflow.workflowId,
      steps,
      controls: {
        schema: workflow.controls?.schema as JSONSchemaDto,
      },
      rawData: workflow,
      payloadSchema: workflow.payload?.schema as unknown as JSONSchemaDto,
      type: WorkflowTypeEnum.BRIDGE,
      description: this.getWorkflowDescription(workflow),
      data: this.castToAnyNotSupportedParam(workflow)?.data,
      tags: this.getWorkflowTags(workflow),
      active: workflowActive,
      status: computeWorkflowStatus(workflowActive, steps),
      defaultPreferences: this.getWorkflowPreferences(workflow),
    };
  }

  private async mapSteps(
    command: SyncCommand,
    commandWorkflowSteps: DiscoverStepOutput[],
    workflow?: NotificationTemplateEntity | undefined
  ): Promise<NotificationStep[]> {
    return Promise.all(
      commandWorkflowSteps.map(async (step: DiscoverStepOutput) => {
        const foundStep = workflow?.steps?.find((workflowStep) => workflowStep.stepId === step.stepId);

        const issues: StepIssuesDto = await this.buildStepIssuesUsecase.execute({
          workflowOrigin: WorkflowOriginEnum.EXTERNAL,
          user: {
            _id: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
          } as UserSessionData,
          stepInternalId: foundStep?._id,
          workflow,
          stepType: step.type as StepTypeEnum,
          controlSchema: step.controls?.schema as JSONSchemaDto,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private castToAnyNotSupportedParam(param: any): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return param as any;
  }
}
