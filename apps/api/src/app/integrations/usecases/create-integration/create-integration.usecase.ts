import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository, DalException } from '@notifire/dal';
import { CreateIntegrationCommand } from './create-integration.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { DeactivateIntegration } from '../deactivate-integration/deactivate-integration.usecase';

@Injectable()
export class CreateIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    private deactivateIntegration: DeactivateIntegration
  ) {}

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

      if (command.active) {
        await this.deactivateIntegration.execute({
          applicationId: command.applicationId,
          organizationId: command.organizationId,
          integrationId: response._id,
          channel: command.channel,
        });
      }
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return response;
  }
}
