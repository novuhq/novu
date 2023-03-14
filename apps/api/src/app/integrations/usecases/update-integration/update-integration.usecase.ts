import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { UpdateIntegrationCommand } from './update-integration.command';
import { DeactivateSimilarChannelIntegrations } from '../deactivate-integration/deactivate-integration.usecase';
import { encryptCredentials } from '../../../shared/services/encryption';
import { CheckIntegration } from '../check-integration/check-integration.usecase';
import { CheckIntegrationCommand } from '../check-integration/check-integration.command';
import { CacheKeyPrefixEnum, InvalidateCacheService } from '../../../shared/services/cache';
import { ChannelTypeEnum } from '@novu/shared';

@Injectable()
export class UpdateIntegration {
  @Inject()
  private checkIntegration: CheckIntegration;
  constructor(
    private invalidateCache: InvalidateCacheService,
    private integrationRepository: IntegrationRepository,
    private deactivateSimilarChannelIntegrations: DeactivateSimilarChannelIntegrations
  ) {}

  async execute(command: UpdateIntegrationCommand): Promise<IntegrationEntity> {
    const existingIntegration = await this.integrationRepository.findById(command.integrationId);
    if (!existingIntegration) throw new NotFoundException(`Entity with id ${command.integrationId} not found`);

    this.invalidateCache.clearCache({
      storeKeyPrefix: [CacheKeyPrefixEnum.INTEGRATION],
      credentials: {
        environmentId: command.environmentId,
      },
    });

    if (command.check) {
      await this.checkIntegration.execute(
        CheckIntegrationCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          credentials: command.credentials,
          providerId: existingIntegration.providerId,
          channel: existingIntegration.channel,
        })
      );
    }

    const updatePayload: Partial<IntegrationEntity> = {};

    if (command.active || command.active === false) {
      updatePayload.active = command.active;
    }

    if (command.credentials) {
      updatePayload.credentials = encryptCredentials(command.credentials);
    }

    if (!Object.keys(updatePayload).length) {
      throw new BadRequestException('No properties found for update');
    }

    await this.integrationRepository.update(
      {
        _id: command.integrationId,
        _environmentId: command.environmentId,
      },
      {
        $set: updatePayload,
      }
    );

    if (command.active && ![ChannelTypeEnum.CHAT, ChannelTypeEnum.PUSH].includes(existingIntegration.channel)) {
      await this.deactivateSimilarChannelIntegrations.execute({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        integrationId: command.integrationId,
        channel: existingIntegration.channel,
      });
    }

    const updatedIntegration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _environmentId: command.environmentId,
    });
    if (!updatedIntegration) throw new NotFoundException(`Integration with id ${command.integrationId} is not found`);

    return updatedIntegration;
  }
}
