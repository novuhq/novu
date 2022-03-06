import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@notifire/dal';
import { GetIntegrationCommand } from './get-integration.command';

@Injectable()
export class GetIntegrations {
  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: GetIntegrationCommand): Promise<IntegrationEntity[]> {
    return await this.integrationRepository.findByApplicationId(command.applicationId);
  }
}
