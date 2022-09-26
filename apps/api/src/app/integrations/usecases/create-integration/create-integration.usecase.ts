import { Inject, Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository, DalException } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { CreateIntegrationCommand } from './create-integration.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { DeactivateSimilarChannelIntegrations } from '../deactivate-integration/deactivate-integration.usecase';
import { encryptCredentials } from '../../../shared/services/encryption';
import { CheckIntegrationCommand } from '../check-integration/check-integration.command';
import { CheckIntegration } from '../check-integration/check-integration.usecase';
@Injectable()
export class CreateIntegration {
  @Inject()
  private checkIntegration: CheckIntegration;
  constructor(
    private integrationRepository: IntegrationRepository,
    private deactivateSimilarChannelIntegrations: DeactivateSimilarChannelIntegrations
  ) {}

  async execute(command: CreateIntegrationCommand): Promise<IntegrationEntity> {
    let response: IntegrationEntity;

    try {
      if (command.check) {
        await this.checkIntegration.execute(
          CheckIntegrationCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            providerId: command.providerId,
            channel: command.channel,
            credentials: command.credentials,
          })
        );
      }

      response = await this.integrationRepository.create({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        providerId: command.providerId,
        channel: command.channel,
        credentials: encryptCredentials(command.credentials),
        active: command.active,
      });

      if (command.active && ![ChannelTypeEnum.CHAT, ChannelTypeEnum.PUSH].includes(command.channel)) {
        await this.deactivateSimilarChannelIntegrations.execute({
          environmentId: command.environmentId,
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
