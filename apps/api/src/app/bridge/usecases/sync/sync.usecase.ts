import { BadRequestException, HttpException, Injectable } from '@nestjs/common';

import {
  EnvironmentRepository,
  NotificationGroupRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
} from '@novu/dal';
import {
  AnalyticsService,
  CreateWorkflow,
  CreateWorkflowCommand,
  ExecuteBridgeRequest,
  GetFeatureFlag,
  GetFeatureFlagCommand,
  NotificationStep,
  UpdateWorkflow,
  UpdateWorkflowCommand,
  UpsertPreferences,
  UpsertWorkflowPreferencesCommand,
} from '@novu/application-generic';
import { FeatureFlagsKeysEnum, WorkflowCreationSourceEnum, WorkflowOriginEnum, WorkflowTypeEnum } from '@novu/shared';
import { DiscoverOutput, DiscoverStepOutput, DiscoverWorkflowOutput, GetActionEnum } from '@novu/framework/internal';

import { SyncCommand } from './sync.command';
import { DeleteWorkflow, DeleteWorkflowCommand } from '../delete-workflow';
import { CreateBridgeResponseDto } from '../../dtos/create-bridge-response.dto';

@Injectable()
export class Sync {
  constructor(
    private createWorkflowUsecase: CreateWorkflow,
    private updateWorkflowUsecase: UpdateWorkflow,
    private deleteWorkflow: DeleteWorkflow,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private environmentRepository: EnvironmentRepository,
    private executeBridgeRequest: ExecuteBridgeRequest,
    private analyticsService: AnalyticsService,
    private upsertPreferences: UpsertPreferences,
    private getFeatureFlag: GetFeatureFlag
  ) {}
  async execute(command: SyncCommand): Promise<CreateBridgeResponseDto> {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }

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

    const persistedWorkflowsInBridge = await this.createWorkflows(command, discover.workflows);

    await this.disposeOldWorkflows(command, persistedWorkflowsInBridge);

    await this.updateBridgeUrl(command);

    return persistedWorkflowsInBridge;
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

    await Promise.all(
      workflowsToDelete?.map((workflow) => {
        return this.deleteWorkflow.execute(
          DeleteWorkflowCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
            workflowId: workflow._id,
          })
        );
      })
    );
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

  private async createWorkflows(
    command: SyncCommand,
    workflowsFromBridge: DiscoverWorkflowOutput[]
  ): Promise<NotificationTemplateEntity[]> {
    return Promise.all(
      workflowsFromBridge.map(async (workflow) => {
        const workflowExist = await this.notificationTemplateRepository.findByTriggerIdentifier(
          command.environmentId,
          workflow.workflowId
        );

        let savedWorkflow: NotificationTemplateEntity | undefined;

        if (workflowExist) {
          savedWorkflow = await this.updateWorkflow(workflowExist, command, workflow);
        } else {
          const notificationGroupId = await this.getNotificationGroup(
            this.castToAnyNotSupportedParam(workflow.options)?.notificationGroupId,
            command.environmentId
          );

          if (!notificationGroupId) {
            throw new BadRequestException('Notification group not found');
          }
          const isWorkflowActive = this.castToAnyNotSupportedParam(workflow.options)?.active ?? true;

          savedWorkflow = await this.createWorkflow(notificationGroupId, isWorkflowActive, command, workflow);
        }

        const isWorkflowPreferencesEnabled = await this.getFeatureFlag.execute(
          GetFeatureFlagCommand.create({
            key: FeatureFlagsKeysEnum.IS_WORKFLOW_PREFERENCES_ENABLED,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
          })
        );

        if (isWorkflowPreferencesEnabled) {
          await this.upsertPreferences.upsertWorkflowPreferences(
            UpsertWorkflowPreferencesCommand.create({
              environmentId: savedWorkflow._environmentId,
              organizationId: savedWorkflow._organizationId,
              templateId: savedWorkflow._id,
              preferences: workflow.preferences || {},
            })
          );
        }

        return savedWorkflow;
      })
    );
  }

  private async createWorkflow(
    notificationGroupId: string,
    isWorkflowActive: boolean,
    command: SyncCommand,
    workflow: DiscoverWorkflowOutput
  ): Promise<NotificationTemplateEntity> {
    return await this.createWorkflowUsecase.execute(
      CreateWorkflowCommand.create({
        origin: WorkflowOriginEnum.EXTERNAL,
        type: WorkflowTypeEnum.BRIDGE,
        notificationGroupId,
        draft: !isWorkflowActive,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        name: this.getWorkflowName(workflow),
        triggerIdentifier: workflow.workflowId,
        __source: WorkflowCreationSourceEnum.BRIDGE,
        steps: this.mapSteps(workflow.steps),
        /** @deprecated */
        inputs: {
          schema: workflow.controls?.schema || workflow.inputs.schema,
        },
        controls: {
          schema: workflow.controls?.schema || workflow.inputs.schema,
        },
        rawData: workflow as unknown as Record<string, unknown>,
        payloadSchema:
          (workflow.payload?.schema as Record<string, unknown>) ||
          /** @deprecated */
          (workflow.options?.payloadSchema as Record<string, unknown>),
        active: isWorkflowActive,
        description: this.getWorkflowDescription(workflow),
        data: this.castToAnyNotSupportedParam(workflow).options?.data,
        tags: this.getWorkflowTags(workflow),
        critical: this.castToAnyNotSupportedParam(workflow.options)?.critical ?? false,
        preferenceSettings: this.castToAnyNotSupportedParam(workflow.options)?.preferenceSettings,
      })
    );
  }

  private async updateWorkflow(
    workflowExist: NotificationTemplateEntity,
    command: SyncCommand,
    workflow: DiscoverWorkflowOutput
  ): Promise<NotificationTemplateEntity> {
    return await this.updateWorkflowUsecase.execute(
      UpdateWorkflowCommand.create({
        id: workflowExist._id,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        name: this.getWorkflowName(workflow),
        workflowId: workflow.workflowId,
        steps: this.mapSteps(workflow.steps, workflowExist),
        inputs: {
          schema: workflow.controls?.schema || workflow.inputs.schema,
        },
        controls: {
          schema: workflow.controls?.schema || workflow.inputs.schema,
        },
        rawData: workflow,
        payloadSchema:
          (workflow.payload?.schema as Record<string, unknown>) ||
          (workflow.options?.payloadSchema as Record<string, unknown>),
        type: WorkflowTypeEnum.BRIDGE,
        description: this.getWorkflowDescription(workflow),
        data: this.castToAnyNotSupportedParam(workflow.options)?.data,
        tags: this.getWorkflowTags(workflow),
        active: this.castToAnyNotSupportedParam(workflow.options)?.active ?? true,
        critical: this.castToAnyNotSupportedParam(workflow.options)?.critical ?? false,
        preferenceSettings: this.castToAnyNotSupportedParam(workflow.options)?.preferenceSettings,
      })
    );
  }

  private mapSteps(
    commandWorkflowSteps: DiscoverStepOutput[],
    workflow?: NotificationTemplateEntity | undefined
  ): NotificationStep[] {
    const steps: NotificationStep[] = commandWorkflowSteps.map((step) => {
      const foundStep = workflow?.steps?.find((workflowStep) => workflowStep.stepId === step.stepId);

      const template = {
        _id: foundStep?._id,
        type: step.type,
        name: step.stepId,
        inputs: step.controls || step.inputs,
        controls: step.controls || step.inputs,
        output: step.outputs,
        options: step.options,
        code: step.code,
      };

      return {
        template,
        name: step.stepId,
        stepId: step.stepId,
        uuid: step.stepId,
        shouldStopOnFail: this.castToAnyNotSupportedParam(step.options)?.failOnErrorEnabled ?? false,
      };
    });

    return steps;
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

  private getWorkflowName(workflow: DiscoverWorkflowOutput): string {
    return workflow.name || workflow.workflowId;
  }

  private getWorkflowDescription(workflow: DiscoverWorkflowOutput): string {
    return workflow.description || '';
  }

  private getWorkflowTags(workflow: DiscoverWorkflowOutput): string[] {
    return workflow.tags || [];
  }

  private castToAnyNotSupportedParam(param: any): any {
    return param as any;
  }
}
