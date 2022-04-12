import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { GetActiveIntegrationsCommand } from './get-active-integration.command';

@Injectable()
export class GetActiveIntegrations {
  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: GetActiveIntegrationsCommand): Promise<IntegrationEntity[]> {
    return await this.integrationRepository.find({
      _environmentId: command.environmentId,
      active: true,
    });
  }
}
