import { Injectable, NotFoundException } from '@nestjs/common';

import { SelectIntegration, SelectIntegrationCommand } from '@novu/application-generic';
import { ChannelTypeEnum } from '@novu/shared';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';

import { GetActiveIntegrationsCommand } from './get-active-integration.command';
import { GetActiveIntegrationResponseDto } from '../../dtos/get-active-integration-response.dto';

@Injectable()
export class GetActiveIntegrations {
  constructor(private integrationRepository: IntegrationRepository, private selectIntegration: SelectIntegration) {}

  async execute(command: GetActiveIntegrationsCommand): Promise<GetActiveIntegrationResponseDto[]> {
    const channelTypes = Object.values(ChannelTypeEnum);

    const activeIntegration = await this.integrationRepository.find({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      active: true,
    });

    if (!activeIntegration.length) {
      return [];
    }

    const selectedIntegrations = await this.getSelectedIntegrations(channelTypes, command);

    return this.mapBySelectedIntegration(activeIntegration, selectedIntegrations);
  }

  private mapBySelectedIntegration(
    activeIntegration: IntegrationEntity[],
    selectedIntegrations: IntegrationEntity[]
  ): GetActiveIntegrationResponseDto[] {
    return activeIntegration.map((integration) => {
      const selected = selectedIntegrations.find((selectedIntegration) => selectedIntegration._id === integration._id);

      return selected ? { ...integration, selected: true } : { ...integration, selected: false };
    });
  }

  private async getSelectedIntegrations(channelTypes: string[], command: GetActiveIntegrationsCommand) {
    return (
      await Promise.all(
        channelTypes.map(async (channelType) => {
          return await this.selectIntegration.execute(
            SelectIntegrationCommand.create({
              organizationId: command.organizationId,
              environmentId: command.environmentId,
              userId: command.userId,
              channelType: channelType as ChannelTypeEnum,
              providerId: command.providerId,
            })
          );
        })
      )
    ).filter(notNullish);
  }
}

export function notNullish<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}
