import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@notifire/dal';
import { GetActiveIntegrationsCommand } from './get-active-integration.command';

@Injectable()
export class GetActiveIntegrations {
  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: GetActiveIntegrationsCommand): Promise<IntegrationEntity[]> {
    return await this.integrationRepository.find({
      _applicationId: command.applicationId,
      active: true,
    });
  }
}
