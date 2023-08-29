import { Injectable } from '@nestjs/common';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  SmsProviderIdEnum,
  StepTypeEnum,
  WorkflowChannelsIntegrationStatus,
} from '@novu/shared';
import { GetActiveIntegrationsCommand } from '../../../integrations/usecases/get-active-integration/get-active-integration.command';
import { GetActiveIntegrations } from '../../../integrations/usecases/get-active-integration/get-active-integration.usecase';
import { GetActiveIntegrationsStatusCommand } from './get-active-integrations-status.command';

import { IntegrationResponseDto } from '../../../integrations/dtos/integration-response.dto';
import { WorkflowResponse } from '../../dto/workflow-response.dto';
import { NotificationStep } from '../create-notification-template';
import { CalculateLimitNovuIntegration, CalculateLimitNovuIntegrationCommand } from '@novu/application-generic';

@Injectable()
export class GetActiveIntegrationsStatus {
  constructor(
    private getActiveIntegrationUsecase: GetActiveIntegrations,
    private calculateLimitNovuIntegrationUsecase: CalculateLimitNovuIntegration
  ) {}

  async execute(command: GetActiveIntegrationsStatusCommand): Promise<WorkflowResponse[] | WorkflowResponse> {
    const defaultStateByChannelType = Object.keys(ChannelTypeEnum).reduce((acc, key) => {
      const channelType = ChannelTypeEnum[key];

      acc[channelType] = { hasActiveIntegrations: false };

      if (channelType === ChannelTypeEnum.EMAIL || channelType === ChannelTypeEnum.SMS) {
        acc[channelType] = { ...acc[channelType], hasPrimaryIntegrations: false };
      }

      return acc;
    }, {} as WorkflowChannelsIntegrationStatus);

    const activeIntegrations = await this.getActiveIntegrationUsecase.execute(
      GetActiveIntegrationsCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
      })
    );

    const activeIntegrationsByEnv = activeIntegrations.filter(
      (activeIntegration) => activeIntegration._environmentId === command.environmentId
    );

    const activeStateByChannelType = this.updateStateByChannelType(activeIntegrationsByEnv, defaultStateByChannelType);

    const activeStateByChannelTypeWithNovu = await this.processNovuProviders(
      activeIntegrationsByEnv,
      command,
      activeStateByChannelType
    );

    return this.updateActiveIntegrationsStatus(command.workflows, activeStateByChannelTypeWithNovu);
  }

  private updateStateByChannelType(
    activeIntegrations: IntegrationResponseDto[],
    stateByChannelType: WorkflowChannelsIntegrationStatus
  ): WorkflowChannelsIntegrationStatus {
    for (const integration of activeIntegrations) {
      const channelType = integration.channel;

      stateByChannelType[channelType].hasActiveIntegrations = integration.active;
      const isEmailChannel = channelType === ChannelTypeEnum.EMAIL;
      const isSmsChannel = channelType === ChannelTypeEnum.SMS;

      if ((isEmailChannel || isSmsChannel) && !stateByChannelType[channelType].hasPrimaryIntegrations) {
        stateByChannelType[channelType].hasPrimaryIntegrations = integration.primary;
      }
    }

    return stateByChannelType;
  }

  private updateActiveIntegrationsStatus(
    workflows: WorkflowResponse | WorkflowResponse[],
    activeChannelsStatus: WorkflowChannelsIntegrationStatus
  ) {
    if (Array.isArray(workflows)) {
      return workflows.map((workflow) => {
        const { hasActive, hasPrimary } = this.handleSteps(workflow.steps, activeChannelsStatus);
        workflow.workflowIntegrationStatus = {
          hasActiveIntegrations: hasActive,
          channels: activeChannelsStatus,
          hasPrimaryIntegrations: hasPrimary,
        };

        return workflow;
      });
    } else {
      const { hasActive, hasPrimary } = this.handleSteps(workflows.steps, activeChannelsStatus);

      return {
        ...workflows,
        workflowIntegrationStatus: {
          hasActiveIntegrations: hasActive,
          channels: activeChannelsStatus,
          hasPrimaryIntegrations: hasPrimary,
        },
      };
    }
  }

  private handleSteps(steps: NotificationStep[], activeChannelsStatus: WorkflowChannelsIntegrationStatus) {
    let hasActive = true;
    let hasPrimary: boolean | undefined = undefined;
    const uniqueSteps = Array.from(new Set(steps));
    for (const step of uniqueSteps) {
      const stepType = step.template?.type;
      const skipStep =
        stepType === StepTypeEnum.DELAY || stepType === StepTypeEnum.DIGEST || stepType === StepTypeEnum.TRIGGER;
      const isStepWithPrimaryIntegration = stepType === StepTypeEnum.EMAIL || stepType === StepTypeEnum.SMS;
      if (stepType && !skipStep) {
        const hasActiveIntegrations = activeChannelsStatus[stepType].hasActiveIntegrations;
        if (!hasActiveIntegrations) {
          hasActive = false;
        }

        if (isStepWithPrimaryIntegration) {
          const hasPrimaryIntegration = activeChannelsStatus[stepType].hasPrimaryIntegrations;
          if (!hasPrimaryIntegration) {
            hasPrimary = false;
          }
        }
      }
    }

    return { hasActive, hasPrimary };
  }

  private async processNovuProviders(
    activeIntegrations: IntegrationResponseDto[],
    command: GetActiveIntegrationsStatusCommand,
    stateByChannelType: WorkflowChannelsIntegrationStatus
  ) {
    const primaryNovuProviders = activeIntegrations.filter(
      (integration) =>
        (integration.providerId === EmailProviderIdEnum.Novu || integration.providerId === SmsProviderIdEnum.Novu) &&
        integration.primary
    );

    for (const primaryNovuProvider of primaryNovuProviders) {
      const channelType = primaryNovuProvider.channel;
      let hasLimitReached = true;
      const limit = await this.calculateLimitNovuIntegrationUsecase.execute(
        CalculateLimitNovuIntegrationCommand.create({
          channelType,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        })
      );
      if (!limit) {
        hasLimitReached = true;
      } else {
        hasLimitReached = limit.limit === limit.count;
      }
      stateByChannelType[channelType].hasActiveIntegrations = !hasLimitReached;
    }

    return stateByChannelType;
  }
}
