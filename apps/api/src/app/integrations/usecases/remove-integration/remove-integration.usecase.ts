import { Injectable, Scope } from '@nestjs/common';
import { IntegrationRepository, DalException } from '@novu/dal';
import { RemoveIntegrationCommand } from './remove-integration.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { CacheKeyPrefixEnum, InvalidateCacheService } from '../../../shared/services/cache';

@Injectable({
  scope: Scope.REQUEST,
})
export class RemoveIntegration {
  constructor(private invalidateCache: InvalidateCacheService, private integrationRepository: IntegrationRepository) {}

  async execute(command: RemoveIntegrationCommand) {
    try {
      this.invalidateCache.clearCache({
        storeKeyPrefix: [CacheKeyPrefixEnum.INTEGRATION],
        credentials: {
          environmentId: command.environmentId,
        },
      });

      await this.integrationRepository.delete({ _environmentId: command.environmentId, _id: command.integrationId });
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return await this.integrationRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
