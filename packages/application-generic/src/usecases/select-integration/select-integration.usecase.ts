import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';

import {
  GetNovuIntegration,
  GetNovuIntegrationCommand,
} from '../get-novu-integration';
import { SelectIntegrationCommand } from './select-integration.command';
import { decryptCredentials } from '../../encryption';

@Injectable()
export class SelectIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    private getNovuIntegration: GetNovuIntegration
  ) {}

  async execute(
    command: SelectIntegrationCommand
  ): Promise<IntegrationEntity | undefined> {
    const query: Partial<IntegrationEntity> & { _organizationId: string } = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      channel: command.channelType,
      providerId: command.providerId,
      active: true,
    };

    const integration = await this.integrationRepository.findOne(
      query,
      undefined,
      { query: { sort: { createdAt: -1 } } }
    );
    integration.credentials = decryptCredentials(integration.credentials);

    if (integration) {
      return integration;
    }

    const novuIntegration = await this.getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        channelType: command.channelType,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
      })
    );

    return novuIntegration;
  }
}
