import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@notifire/dal';
import { CreateIntegrationCommand } from './create-integration.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class CreateIntegration {
  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: CreateIntegrationCommand): Promise<IntegrationEntity> {
    let response: IntegrationEntity;

    try {
      response = await this.integrationRepository.create({
        _applicationId: command.applicationId,
        _organizationId: command.organizationId,
        providerId: command.providerId,
        channel: command.channel,
        credentials: command.credentials,
        active: command.active,
      });
    } catch (e) {
      if (e.status === 422) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return response;
  }
}
