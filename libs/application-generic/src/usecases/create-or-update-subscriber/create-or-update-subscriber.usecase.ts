import { forwardRef, Inject, Injectable } from '@nestjs/common';
import {
  ErrorCodesEnum,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { AnalyticsService } from '../../services/analytics.service';
import {
  buildDedupSubscriberKey,
  buildSubscriberKey,
  CachedEntity,
  InvalidateCacheService,
} from '../../services/cache';
import {
  OAuthHandlerEnum,
  UpdateSubscriberChannel,
  UpdateSubscriberChannelCommand,
} from '../subscribers';
import {
  UpdateSubscriber,
  UpdateSubscriberCommand,
} from '../update-subscriber';
import { CreateOrUpdateSubscriberCommand } from './create-or-update-subscriber.command';
import { EventsDistributedLockService } from '../../services';

@Injectable()
export class CreateOrUpdateSubscriberUseCase {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private subscriberRepository: SubscriberRepository,
    private updateSubscriberUseCase: UpdateSubscriber,
    private updateSubscriberChannel: UpdateSubscriberChannel,
    private analyticsService: AnalyticsService,
    @Inject(forwardRef(() => EventsDistributedLockService))
    private eventsDistributedLockService: EventsDistributedLockService,
  ) {}

  async execute(command: CreateOrUpdateSubscriberCommand) {
    return await this.eventsDistributedLockService.applyLock<SubscriberEntity>(
      {
        resource: buildDedupSubscriberKey({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
        ttl: 10000,
      },
      async () => await this.createOrUpdateSubscriber(command),
    );
  }

  private async createOrUpdateSubscriber(
    command: CreateOrUpdateSubscriberCommand,
  ) {
    const existingSubscriber = await this.getExistingSubscriber(command);

    if (existingSubscriber) {
      return await this.updateSubscriber(command, existingSubscriber);
    }
    const createdSubscriber = await this.createSubscriber(command);
    this.publishSubscriberUpdatedEvent(command);

    return await this.updateSubscriberCredentials(command, createdSubscriber);
  }

  private async updateSubscriber(
    command: CreateOrUpdateSubscriberCommand,
    existingSubscriber: SubscriberEntity,
  ) {
    return await this.updateSubscriberUseCase.execute(
      this.buildUpdateSubscriberCommand(command, existingSubscriber),
    );
  }

  private async getExistingSubscriber(
    command: CreateOrUpdateSubscriberCommand,
  ) {
    const existingSubscriber: SubscriberEntity =
      command.subscriber ??
      (await this.fetchSubscriber({
        _environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      }));

    return existingSubscriber;
  }

  private async updateSubscriberCredentials(
    command: CreateOrUpdateSubscriberCommand,
    subscriber: SubscriberEntity,
  ) {
    let updatedSubscriber: SubscriberEntity | undefined;
    if (command.channels?.length) {
      await this.updateCredentials(command);
      // fetch subscriber again as channel credentials are updated
      updatedSubscriber = await this.fetchSubscriber({
        _environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      });
    }

    return updatedSubscriber || subscriber;
  }

  private publishSubscriberUpdatedEvent(
    command: CreateOrUpdateSubscriberCommand,
  ) {
    this.analyticsService.mixpanelTrack('Subscriber Created', '', {
      _organization: command.organizationId,
      hasEmail: !!command.email,
      hasPhone: !!command.phone,
      hasAvatar: !!command.avatar,
      hasLocale: !!command.locale,
      hasData: !!command.data,
      hasCredentials: !!command.channels,
    });
  }

  private buildUpdateSubscriberCommand(
    command: CreateOrUpdateSubscriberCommand,
    subscriber: SubscriberEntity,
  ) {
    return UpdateSubscriberCommand.create({
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
      channels: command.channels,
    });
  }

  private async updateCredentials(command: CreateOrUpdateSubscriberCommand) {
    for (const channel of command.channels) {
      await this.updateSubscriberChannel.execute(
        UpdateSubscriberChannelCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          subscriberId: command.subscriberId,
          providerId: channel.providerId,
          credentials: channel.credentials,
          integrationIdentifier: channel.integrationIdentifier,
          oauthHandler: OAuthHandlerEnum.EXTERNAL,
          isIdempotentOperation: false,
        }),
      );
    }
  }

  private async createSubscriber(command: CreateOrUpdateSubscriberCommand) {
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
      true,
    );
  }
}
