import { Injectable } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { AnalyticsService, buildSubscriberKey, InvalidateCacheService } from '../../services';
import { UpdateSubscriber, UpdateSubscriberCommand } from '../update-subscriber';
import { OAuthHandlerEnum, UpdateSubscriberChannel, UpdateSubscriberChannelCommand } from '../subscribers';
import { RetryOnError } from '../../decorators/retry-on-error-decorator';
import { CreateOrUpdateSubscriberCommand } from './create-or-update-subscriber.command';

@Injectable()
export class CreateOrUpdateSubscriberUseCase {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private subscriberRepository: SubscriberRepository,
    private updateSubscriberUseCase: UpdateSubscriber,
    private updateSubscriberChannel: UpdateSubscriberChannel,
    private analyticsService: AnalyticsService
  ) {}

  @RetryOnError('MongoServerError', {
    maxRetries: 3,
    delay: 500,
  })
  async execute(command: CreateOrUpdateSubscriberCommand) {
    const persistedSubscriber = await this.getExistingSubscriber(command);

    if (persistedSubscriber) {
      await this.updateSubscriber(command, persistedSubscriber);
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
    this.publishSubscriberCreatedEvent(command);

    return createdSubscriber;
  }

  private async fetchSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(_environmentId, subscriberId, false);
  }
}
