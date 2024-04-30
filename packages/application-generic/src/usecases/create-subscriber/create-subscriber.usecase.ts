import { Injectable, Logger } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { SubscriberEntity, ErrorCodesEnum } from '@novu/dal';

import {
  CachedEntity,
  InvalidateCacheService,
  buildSubscriberKey,
} from '../../services/cache';
import { CreateSubscriberCommand } from './create-subscriber.command';
import {
  UpdateSubscriber,
  UpdateSubscriberCommand,
} from '../update-subscriber';

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
      (await this.fetchSubscriber({
        _environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      }));

    if (!subscriber) {
      subscriber = await this.createSubscriber(command);
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
          locale: command.locale,
          data: command.data,
          subscriber,
        })
      );
    }

    return subscriber;
  }

  private async createSubscriber(command: CreateSubscriberCommand) {
    try {
      await this.invalidateCache.invalidateByKey({
        key: buildSubscriberKey({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
      });

      const subscriberPayload = {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        firstName: command.firstName,
        lastName: command.lastName,
        subscriberId: command.subscriberId,
        email: command.email,
        phone: command.phone,
        avatar: command.avatar,
        locale: command.locale,
        data: command.data,
      };

      return await this.subscriberRepository.create(subscriberPayload);
    } catch (err: any) {
      /*
       * Possible race condition on subscriber creation, try fetch newly created the subscriber
       */
      if (err.code === ErrorCodesEnum.DUPLICATE_KEY) {
        return await this.fetchSubscriber({
          _environmentId: command.environmentId,
          subscriberId: command.subscriberId,
        });
      } else {
        throw err;
      }
    }
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async fetchSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(
      _environmentId,
      subscriberId,
      true
    );
  }
}
