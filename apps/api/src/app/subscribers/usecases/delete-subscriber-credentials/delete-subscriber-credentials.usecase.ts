import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { AnalyticsService, buildSubscriberKey, InvalidateCacheService } from '@novu/application-generic';

import { DeleteSubscriberCredentialsCommand } from './delete-subscriber-credentials.command';
import { GetSubscriberCommand, GetSubscriber } from '../get-subscriber';

@Injectable()
export class DeleteSubscriberCredentials {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService,
    private getSubscriberUseCase: GetSubscriber
  ) {}

  async execute(command: DeleteSubscriberCredentialsCommand): Promise<void> {
    const foundSubscriber = await this.getSubscriberUseCase.execute(
      GetSubscriberCommand.create({
        ...command,
      })
    );

    await this.deleteSubscriberCredentialsOfOneProvider(
      foundSubscriber.subscriberId,
      command.environmentId,
      command.providerId,
      foundSubscriber._id
    );

    this.analyticsService.mixpanelTrack('Delete Subscriber Credentials - [Subscribers]', '', {
      providerId: command.providerId,
      _organization: command.organizationId,
      _subscriberId: foundSubscriber._id,
    });
  }

  private async deleteSubscriberCredentialsOfOneProvider(
    subscriberId: string,
    environmentId: string,
    providerId: string,
    _subscriberId: string
  ) {
    await this.invalidateCache.invalidateByKey({
      key: buildSubscriberKey({
        subscriberId,
        _environmentId: environmentId,
      }),
    });

    return await this.subscriberRepository.updateOne(
      {
        _id: _subscriberId,
        _environmentId: environmentId,
      },
      { $pull: { channels: { providerId } } }
    );
  }
}
