import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { GetDecryptedIntegrationsCommand } from './get-decrypted-integrations.command';
import { decryptCredentials } from '../../../shared/services/encryption';

@Injectable()
export class GetDecryptedIntegrations {
  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: GetDecryptedIntegrationsCommand): Promise<IntegrationEntity[]> {
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

    const integrations = command.findOne
      ? [await this.integrationRepository.findOne(query)]
      : await this.integrationRepository.find(query);

    return integrations
      .filter((integration) => integration)
      .map((integration: IntegrationEntity) => {
        integration.credentials = decryptCredentials(integration.credentials);

        return integration;
      });
  }
}
