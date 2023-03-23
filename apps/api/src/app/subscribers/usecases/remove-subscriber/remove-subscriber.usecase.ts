import { Injectable } from '@nestjs/common';
import { SubscriberRepository, DalException } from '@novu/dal';
import { RemoveSubscriberCommand } from './remove-subscriber.command';
import { GetSubscriber } from '../get-subscriber';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { InvalidateCacheService } from '../../../shared/services/cache';
import { entityBuilder } from '../../../shared/services/cache/keys';

@Injectable()
export class RemoveSubscriber {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private subscriberRepository: SubscriberRepository,
    private getSubscriber: GetSubscriber
  ) {}

  async execute(command: RemoveSubscriberCommand) {
    try {
      const { environmentId: _environmentId, organizationId, subscriberId } = command;
      const subscriber = await this.getSubscriber.execute({
        environmentId: _environmentId,
        organizationId,
        subscriberId,
      });

      await this.invalidateCache.invalidateByKey({
        key: entityBuilder().subscriber({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
      });

      await this.subscriberRepository.delete({
        _environmentId: subscriber._environmentId,
        _organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
      });
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return {
      acknowledged: true,
      status: 'deleted',
    };
  }
}
