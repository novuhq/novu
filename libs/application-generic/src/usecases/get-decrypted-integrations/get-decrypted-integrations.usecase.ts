import { Injectable } from '@nestjs/common';
import { ICredentialsEntity, IntegrationEntity, IntegrationRepository } from '@novu/dal';

import { decryptCredentials } from '../../encryption';
import { GetDecryptedIntegrationsCommand } from './get-decrypted-integrations.command';

@Injectable()
export class GetDecryptedIntegrations {
  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: GetDecryptedIntegrationsCommand): Promise<IntegrationEntity[]> {
    const query: Partial<IntegrationEntity> & { _organizationId: string } = {
      _organizationId: command.organizationId,
    };

    if (command.scopeToEnvironment) {
      query._environmentId = command.environmentId;
    }

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

    return foundIntegrations
      .filter((integration) => integration)
      .map((integration: IntegrationEntity) => {
        if (command.returnCredentials === false) {
          /*
           * Return an empty `credentials` object instead of omitting the field.
           * Older `@novu/api` SDK versions (e.g. 3.15.0) declare `credentials` as a
           * required object in their zod schema, so omitting it causes response
           * validation to fail. An empty object preserves the same effective
           * "no credentials" semantics while keeping previously released
           * SDK clients working.
           */
          return { ...integration, credentials: {} as ICredentialsEntity };
        }

        return GetDecryptedIntegrations.getDecryptedCredentials(integration);
      });
  }

  public static getDecryptedCredentials(integration: IntegrationEntity) {
    integration.credentials = decryptCredentials(integration.credentials);

    return integration;
  }
}
