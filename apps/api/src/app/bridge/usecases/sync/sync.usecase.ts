import { BadRequestException, Injectable } from '@nestjs/common';

import {
  NotificationTemplateRepository,
  EnvironmentRepository,
  NotificationGroupRepository,
  NotificationTemplateEntity,
  PreferencesActorEnum,
} from '@novu/dal';
import {
  AnalyticsService,
  CreateWorkflow,
  CreateWorkflowCommand,
  NotificationStep,
  UpdateWorkflow,
  UpdateWorkflowCommand,
  ExecuteBridgeRequest,
  UpsertPreferences,
  UpsertPreferencesCommand,
} from '@novu/application-generic';
import { WorkflowTypeEnum } from '@novu/shared';
import { DiscoverOutput, DiscoverStepOutput, DiscoverWorkflowOutput, GetActionEnum } from '@novu/framework';

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
    private upsertPreferences: UpsertPreferences
  ) {}
  async execute(command: SyncCommand): Promise<CreateBridgeResponseDto> {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });

    if (!environment) {
      throw new BadRequestException('Environment not found');
    }

    let discover: DiscoverOutput | undefined;
    try {
      discover = (await this.executeBridgeRequest.execute({
        bridgeUrl: command.bridgeUrl,
        apiKey: environment.apiKeys[0].key,
        action: GetActionEnum.DISCOVER,
        retriesLimit: 1,
      })) as DiscoverOutput;
    } catch (error: any) {
      throw new BadRequestException(`Bridge URL is not valid. ${error.message}`);
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

    const createdWorkflows = await this.createWorkflows(command, discover.workflows);

    await this.disposeOldWorkflows(command, createdWorkflows);

    await this.updateBridgeUrl(command);

    return createdWorkflows;
  }

  private async updateBridgeUrl(command: SyncCommand) {
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

  private async disposeOldWorkflows(command: SyncCommand, createdWorkflows: NotificationTemplateEntity[]) {
    const workflowIds = createdWorkflows.map((i) => i._id);

    const deletedWorkflows = await this.notificationTemplateRepository.find({
      _environmentId: command.environmentId,
      type: {
        $in: [WorkflowTypeEnum.ECHO, WorkflowTypeEnum.BRIDGE],
      },
      _id: { $nin: workflowIds },
    });

    await Promise.all(
      deletedWorkflows?.map((workflow) => {
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

  private async createWorkflows(command: SyncCommand, workflows: DiscoverWorkflowOutput[]) {
    return Promise.all(
      workflows.map(async (workflow) => {
        const workflowExist = await this.notificationTemplateRepository.findByTriggerIdentifier(
          command.environmentId,
          workflow.workflowId
        );

        let savedWorkflow: NotificationTemplateEntity | undefined;

        if (workflowExist) {
          savedWorkflow = await this.updateWorkflowUsecase.execute(
            UpdateWorkflowCommand.create({
              id: workflowExist._id,
              environmentId: command.environmentId,
              organizationId: command.organizationId,
              userId: command.userId,
              name: workflow.workflowId,
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
              description: this.castToAnyNotSupportedParam(workflow.options).description,
              data: this.castToAnyNotSupportedParam(workflow.options)?.data,
              tags: workflow.tags,
              active: this.castToAnyNotSupportedParam(workflow.options)?.active ?? true,
              critical: this.castToAnyNotSupportedParam(workflow.options)?.critical ?? false,
              preferenceSettings: this.castToAnyNotSupportedParam(workflow.options)?.preferenceSettings,
            })
          );
        } else {
          const notificationGroupId = await this.getNotificationGroup(
            this.castToAnyNotSupportedParam(workflow.options)?.notificationGroupId,
            command.environmentId
          );

          if (!notificationGroupId) {
            throw new BadRequestException('Notification group not found');
          }
          const isWorkflowActive = this.castToAnyNotSupportedParam(workflow.options)?.active ?? true;

          savedWorkflow = await this.createWorkflowUsecase.execute(
            CreateWorkflowCommand.create({
              notificationGroupId,
              draft: !isWorkflowActive,
              environmentId: command.environmentId,
              organizationId: command.organizationId,
              userId: command.userId,
              name: workflow.workflowId,
              __source: 'bridge',
              type: WorkflowTypeEnum.BRIDGE,
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
              description: this.castToAnyNotSupportedParam(workflow.options).description,
              data: this.castToAnyNotSupportedParam(workflow).options?.data,
              tags: workflow.tags || [],
              critical: this.castToAnyNotSupportedParam(workflow.options)?.critical ?? false,
              preferenceSettings: this.castToAnyNotSupportedParam(workflow.options)?.preferenceSettings,
            })
          );
        }

        await this.upsertPreferences.execute(
          UpsertPreferencesCommand.create({
            actor: PreferencesActorEnum.WORKFLOW,
            environmentId: savedWorkflow._environmentId,
            organizationId: savedWorkflow._organizationId,
            templateId: savedWorkflow._id,
            preferences: workflow.preferences,
          })
        );

        return savedWorkflow;
      })
    );
  }

  private mapSteps(commandWorkflowSteps: DiscoverStepOutput[], workflow?: NotificationTemplateEntity | undefined) {
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

  private async getNotificationGroup(notificationGroupIdCommand: string | undefined, environmentId: string) {
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

  private castToAnyNotSupportedParam(param: any): any {
    return param as any;
  }
}
