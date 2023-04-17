import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';

import { decryptCredentials } from '../../encryption';
import { GetDecryptedIntegrationsCommand } from './get-decrypted-integrations.command';
import {
  GetNovuIntegration,
  GetNovuIntegrationCommand,
} from '../get-novu-integration';

@Injectable()
export class GetDecryptedIntegrations {
  constructor(
    private integrationRepository: IntegrationRepository,
    private getNovuIntegration: GetNovuIntegration
  ) {}

  async execute(
    command: GetDecryptedIntegrationsCommand
  ): Promise<IntegrationEntity[]> {
    const query: Partial<IntegrationEntity> & { _environmentId: string } = {
      _environmentId: command.environmentId,
    };

    if (command.active) {
      query.active = command.active;
    }

    if (command.channelType) {
      query.channel = command.channelType;
    }

    if (command.providerId) {
      query.providerId = command.providerId;
    }

    const foundIntegrations = command.findOne
      ? [await this.integrationRepository.findOne(query)]
      : await this.integrationRepository.find(query);

    const integrations = foundIntegrations
      .filter((integration) => integration)
      .map((integration: IntegrationEntity) => {
        integration.credentials = decryptCredentials(integration.credentials);

        return integration;
      });

    if (command.channelType === undefined || integrations.length > 0) {
      return integrations;
    }

    const novuIntegration = await this.getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        channelType: command.channelType,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
      })
    );

    return novuIntegration ? [novuIntegration] : [];
  }
}
