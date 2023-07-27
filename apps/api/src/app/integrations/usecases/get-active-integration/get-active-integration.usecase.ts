import { Injectable } from '@nestjs/common';

import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
  SelectIntegration,
  SelectIntegrationCommand,
  FeatureFlagCommand,
  GetIsMultiProviderConfigurationEnabled,
} from '@novu/application-generic';
import { ChannelTypeEnum } from '@novu/shared';
import { EnvironmentEntity, EnvironmentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';

import { GetActiveIntegrationsCommand } from './get-active-integration.command';
import { GetActiveIntegrationResponseDto } from '../../dtos/get-active-integration-response.dto';

@Injectable()
export class GetActiveIntegrations {
  constructor(
    private integrationRepository: IntegrationRepository,
    private selectIntegration: SelectIntegration,
    private environmentRepository: EnvironmentRepository,
    private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations,
    private getIsMultiProviderConfigurationEnabled: GetIsMultiProviderConfigurationEnabled
  ) {}

  async execute(command: GetActiveIntegrationsCommand): Promise<GetActiveIntegrationResponseDto[]> {
    const isMultiProviderConfigurationEnabled = await this.getIsMultiProviderConfigurationEnabled.execute(
      FeatureFlagCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );

    const activeIntegrations = await this.getDecryptedIntegrationsUsecase.execute(
      GetDecryptedIntegrationsCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        active: true,
      })
    );

    if (!activeIntegrations.length) {
      return [];
    }

    if (!isMultiProviderConfigurationEnabled) {
      return activeIntegrations;
    }

    const environments = await this.environmentRepository.findOrganizationEnvironments(command.organizationId);
    const activeIntegrationChannelTypes = this.getDistinctChannelTypes(activeIntegrations);
    const selectedIntegrations = await this.getSelectedIntegrations(
      command,
      activeIntegrationChannelTypes,
      environments
    );

    return this.mapBySelectedIntegration(activeIntegrations, selectedIntegrations);
  }

  private getDistinctChannelTypes(activeIntegration: IntegrationEntity[]): ChannelTypeEnum[] {
    return activeIntegration.map((integration) => integration.channel).filter(this.distinct);
  }

  distinct = (value, index, self) => {
    return self.indexOf(value) === index;
  };

  private mapBySelectedIntegration(
    activeIntegration: IntegrationEntity[],
    selectedIntegrations: IntegrationEntity[]
  ): GetActiveIntegrationResponseDto[] {
    return activeIntegration.map((integration) => {
      // novu integrations doesn't have unique id that's why we need to compare by environmentId
      const selected = selectedIntegrations.find(
        (selectedIntegration) =>
          selectedIntegration._id === integration._id &&
          selectedIntegration._environmentId === integration._environmentId
      );

      return selected ? { ...integration, selected: true } : { ...integration, selected: false };
    });
  }

  private async getSelectedIntegrations(
    command: GetActiveIntegrationsCommand,
    activeIntegrationChannelTypes: ChannelTypeEnum[],
    environments: EnvironmentEntity[]
  ) {
    const integrationPromises = this.selectIntegrationByEnvironment(
      environments,
      command,
      activeIntegrationChannelTypes
    );

    return (await Promise.all(integrationPromises)).filter(notNullish);
  }

  private selectIntegrationByEnvironment(
    environments,
    command: GetActiveIntegrationsCommand,
    activeIntegrationChannelTypes: ChannelTypeEnum[]
  ) {
    return environments.flatMap((environment) =>
      this.selectIntegrationByChannelType(environment._id, command, activeIntegrationChannelTypes)
    );
  }

  private selectIntegrationByChannelType(
    environmentId,
    command: GetActiveIntegrationsCommand,
    activeIntegrationChannelTypes: ChannelTypeEnum[]
  ) {
    return activeIntegrationChannelTypes.map((channelType) =>
      this.selectIntegration.execute(
        SelectIntegrationCommand.create({
          environmentId: environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          channelType: channelType as ChannelTypeEnum,
          providerId: command.providerId,
        })
      )
    );
  }
}

export function notNullish<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}
