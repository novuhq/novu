import { ConflictException, forwardRef, Inject, Injectable } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { PinoLogger } from 'nestjs-pino';
import {
  AnalyticsService,
  buildDedupSubscriberKey,
  buildSubscriberKey,
  CachedEntity,
  EventsDistributedLockService,
  InvalidateCacheService,
} from '../../services';
import { OAuthHandlerEnum, UpdateSubscriberChannel, UpdateSubscriberChannelCommand } from '../subscribers';
import { UpdateSubscriber, UpdateSubscriberCommand } from '../update-subscriber';
import { CreateOrUpdateSubscriberCommand } from './create-or-update-subscriber.command';
import { RetryOnError } from '../../decorators/retry-on-error-decorator';

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
    private pinoLogger: PinoLogger
  ) {}
  @RetryOnError('MongoServerError', {
    maxRetries: 3,
    delay: 500,
  })
  async execute(command: CreateOrUpdateSubscriberCommand) {
    this.pinoLogger.info(command, 'CreateOrUpdateSubscriberUseCase - START - Attempting to get Lock');

    const subscriberEntity = await this.eventsDistributedLockService.applyLock<SubscriberEntity>(
      {
        resource: buildDedupSubscriberKey({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
        ttl: 10000,
      },
      async () => {
        this.pinoLogger.info(command, 'CreateOrUpdateSubscriberUseCase - Obtained Lock');

        return await this.createOrUpdateSubscriber(command);
      }
    );
    this.pinoLogger.info(command, 'CreateOrUpdateSubscriberUseCase - Lock Released');

    return subscriberEntity;
  }

  private async createOrUpdateSubscriber(command: CreateOrUpdateSubscriberCommand): Promise<SubscriberEntity> {
    const existingSubscriber = await this.getExistingSubscriber(command);
    if (existingSubscriber) {
      if (!command.isUpsert) {
        throw new ConflictException(`Subscriber: ${command.subscriberId} already exists`);
      }
      await this.updateSubscriber(command, existingSubscriber);
    } else {
      await this.createSubscriber(command);
    }

    if (command.channels?.length) {
      await this.updateCredentials(command);
    }

    return await this.fetchSubscriber({
      _environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });
  }

  private async updateSubscriber(command: CreateOrUpdateSubscriberCommand, existingSubscriber: SubscriberEntity) {
    this.pinoLogger.info(command, 'CreateOrUpdateSubscriberUseCase: Subscriber exist - Updating Subscriber');

    return await this.updateSubscriberUseCase.execute(this.buildUpdateSubscriberCommand(command, existingSubscriber));
  }

  private async getExistingSubscriber(command: CreateOrUpdateSubscriberCommand) {
    const existingSubscriber: SubscriberEntity =
      command.subscriber ??
      (await this.fetchSubscriber({
        _environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      }));

    return existingSubscriber;
  }

  private publishSubscriberCreatedEvent(command: CreateOrUpdateSubscriberCommand) {
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

  private buildUpdateSubscriberCommand(command: CreateOrUpdateSubscriberCommand, subscriber: SubscriberEntity) {
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
      timezone: command.timezone,
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
        })
      );
    }
  }

  private async createSubscriber(command: CreateOrUpdateSubscriberCommand): Promise<SubscriberEntity> {
    this.pinoLogger.info(command, 'CreateOrUpdateSubscriberUseCase: Creating Subscriber');
    await this.invalidateCache.invalidateByKey({
      key: buildSubscriberKey({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    const createdSubscriber = await this.subscriberRepository.create({
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
      timezone: command.timezone,
    });
    this.pinoLogger.info(
      { ...command, _id: createdSubscriber._id },
      'CreateOrUpdateSubscriberUseCase: Subscriber Created '
    );
    this.publishSubscriberCreatedEvent(command);

    return createdSubscriber;
  }
  // TODO: Remove one we have an index on subscriberID
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
    return await this.subscriberRepository.findBySubscriberId(_environmentId, subscriberId, true);
  }
}
