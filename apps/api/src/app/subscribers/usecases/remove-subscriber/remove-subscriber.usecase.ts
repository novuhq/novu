import { Injectable } from '@nestjs/common';
import { SubscriberRepository, DalException, TopicSubscribersRepository } from '@novu/dal';
import { buildSubscriberKey, InvalidateCacheService } from '@novu/application-generic';

import { RemoveSubscriberCommand } from './remove-subscriber.command';
import { GetSubscriber } from '../get-subscriber';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class RemoveSubscriber {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private subscriberRepository: SubscriberRepository,
    private getSubscriber: GetSubscriber,
    private topicSubscribersRepository: TopicSubscribersRepository
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
        key: buildSubscriberKey({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
      });

      await this.subscriberRepository.delete({
        _environmentId: subscriber._environmentId,
        _organizationId: subscriber._organizationId,
        subscriberId: subscriber.subscriberId,
      });

      await this.topicSubscribersRepository.delete({
        _environmentId: subscriber._environmentId,
        _organizationId: subscriber._organizationId,
        externalSubscriberId: subscriber.subscriberId,
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
