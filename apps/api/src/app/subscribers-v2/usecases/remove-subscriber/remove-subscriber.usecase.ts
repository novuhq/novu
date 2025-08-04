import { Injectable, NotFoundException } from '@nestjs/common';
import {
  buildFeedKey,
  buildMessageCountKey,
  buildSubscriberKey,
  InvalidateCacheService,
} from '@novu/application-generic';
import { MessageRepository, PreferencesRepository, SubscriberRepository, TopicSubscribersRepository } from '@novu/dal';

import { RemoveSubscriberCommand } from './remove-subscriber.command';

@Injectable()
export class RemoveSubscriber {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private subscriberRepository: SubscriberRepository,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private preferenceRepository: PreferencesRepository,
    private messageRepository: MessageRepository
  ) {}

  async execute({ environmentId: _environmentId, subscriberId }: RemoveSubscriberCommand) {
    await Promise.all([
      this.invalidateCache.invalidateByKey({
        key: buildSubscriberKey({
          subscriberId,
          _environmentId,
        }),
      }),
      this.invalidateCache.invalidateQuery({
        key: buildFeedKey().invalidate({
          subscriberId,
          _environmentId,
        }),
      }),
      this.invalidateCache.invalidateQuery({
        key: buildMessageCountKey().invalidate({
          subscriberId,
          _environmentId,
        }),
      }),
    ]);

    const subscriberInternalIds = await this.subscriberRepository._model.distinct('_id', {
      subscriberId,
      _environmentId,
    });

    if (subscriberInternalIds.length === 0) {
      throw new NotFoundException({ message: 'Subscriber was not found', externalSubscriberId: subscriberId });
    }

    await this.subscriberRepository.withTransaction(async () => {
      /*
       * Note about parallelism in transactions
       *
       * Running operations in parallel is not supported during a transaction.
       * The use of Promise.all, Promise.allSettled, Promise.race, etc. to parallelize operations
       * inside a transaction is undefined behaviour and should be avoided.
       *
       * Refer to https://mongoosejs.com/docs/transactions.html#note-about-parallelism-in-transactions
       */
      await this.subscriberRepository.delete({
        subscriberId,
        _environmentId,
      });

      await this.topicSubscribersRepository.delete({
        _environmentId,
        externalSubscriberId: subscriberId,
      });
      await this.preferenceRepository.delete({
        _environmentId,
        _subscriberId: { $in: subscriberInternalIds },
      });

      await this.messageRepository.delete({
        _subscriberId: { $in: subscriberInternalIds },
        _environmentId,
      });
    });

    return {
      acknowledged: true,
      status: 'deleted',
    };
  }
}
