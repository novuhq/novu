import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { CreateSubscriberCommand } from './create-subscriber.command';
import { UpdateSubscriber, UpdateSubscriberCommand } from '../update-subscriber';
import { CachedEntity, subscriberBuilder } from '../../../shared/interceptors/cached-entity.interceptor';
import { SubscriberEntity } from '@novu/dal';
import { InvalidateCacheService } from '../../../shared/services/cache';

@Injectable()
export class CreateSubscriber {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private subscriberRepository: SubscriberRepository,
    private updateSubscriber: UpdateSubscriber
  ) {}

  async execute(command: CreateSubscriberCommand) {
    let subscriber =
      command.subscriber ??
      (await this.fetchSubscriber({ _environmentId: command.environmentId, subscriberId: command.subscriberId }));

    if (!subscriber) {
      await this.invalidateCache.invalidateByKey({
        key: subscriberBuilder({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
      });

      subscriber = await this.subscriberRepository.create({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        firstName: command.firstName,
        lastName: command.lastName,
        subscriberId: command.subscriberId,
        email: command.email,
        phone: command.phone,
        avatar: command.avatar,
      });
    } else {
      subscriber = await this.updateSubscriber.execute(
        UpdateSubscriberCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          firstName: command.firstName,
          lastName: command.lastName,
          subscriberId: command.subscriberId,
          email: command.email,
          phone: command.phone,
          avatar: command.avatar,
          subscriber,
        })
      );
    }

    return subscriber;
  }

  @CachedEntity({
    builder: subscriberBuilder,
  })
  private async fetchSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(_environmentId, subscriberId);
  }
}
