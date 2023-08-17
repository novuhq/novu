import { Injectable } from '@nestjs/common';
import { GetActiveIntegrations } from '../../../integrations/usecases/get-active-integration/get-active-integration.usecase';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { GetActiveIntegrationsStatusCommand } from './get-active-integrations-status.command';
import { GetActiveIntegrationsCommand } from '../../../integrations/usecases/get-active-integration/get-active-integration.command';

import { WorkflowResponse } from '../../dto/workflow-response.dto';
import { NotificationTemplateEntity } from '@novu/dal';
import { NotificationStep } from '../create-notification-template';
import { IntegrationResponseDto } from '../../../integrations/dtos/integration-response.dto';

@Injectable()
export class GetActiveIntegrationsStatus {
  constructor(private getActiveIntegrationUsecase: GetActiveIntegrations) {}

  async execute(command: GetActiveIntegrationsStatusCommand): Promise<WorkflowResponse[] | WorkflowResponse> {
    const defaultStateByChannelType = Object.keys(ChannelTypeEnum).reduce((acc, key) => {
      acc[ChannelTypeEnum[key]] = false;

      return acc;
    }, {} as { [key in ChannelTypeEnum]: boolean });

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

    return this.updateActiveIntegrationsStatus(command.workflows, activeStateByChannelType);
  }

  private updateStateByChannelType(
    activeIntegrations: IntegrationResponseDto[],
    stateByChannelType: { [key in ChannelTypeEnum]: boolean }
  ): { [key in ChannelTypeEnum]: boolean } {
    return activeIntegrations.reduce((acc, integration) => {
      acc[integration.channel] = true;

      return acc;
    }, stateByChannelType);
  }

  private updateActiveIntegrationsStatus(
    workflows: NotificationTemplateEntity | WorkflowResponse[],
    activeChannelsStatus: { [key in ChannelTypeEnum]: boolean }
  ) {
    if (Array.isArray(workflows)) {
      return workflows.map((workflow) => {
        const isActive = this.handleSteps(workflow.steps, activeChannelsStatus);
        workflow.activeIntegrationStatus = {
          channels: activeChannelsStatus,
          isActive,
        };

        return workflow;
      });
    } else {
      const isActive = this.handleSteps(workflows.steps, activeChannelsStatus);

      return {
        ...workflows,
        activeIntegrationStatus: {
          channels: activeChannelsStatus,
          isActive,
        },
      };
    }
  }

  private handleSteps(steps: NotificationStep[], activeChannelsStatus: { [key in ChannelTypeEnum]: boolean }) {
    let isActive = true;

    for (const step of steps) {
      const stepType = step.template?.type;

      if (
        stepType &&
        ![StepTypeEnum.DELAY, StepTypeEnum.DIGEST].includes(stepType) &&
        activeChannelsStatus[stepType] !== true
      ) {
        isActive = false;
        break; // No need to continue checking other steps if any one of it is inactive
      }
    }

    return isActive;
  }
}
