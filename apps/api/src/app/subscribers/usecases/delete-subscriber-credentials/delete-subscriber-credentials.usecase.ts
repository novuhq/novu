import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriberRepository, IntegrationRepository, SubscriberEntity } from '@novu/dal';
import { AnalyticsService, buildSubscriberKey, InvalidateCacheService } from '@novu/application-generic';

import { DeleteSubscriberCredentialsCommand } from './delete-subscriber-credentials.command';
import { GetSubscriberCommand, GetSubscriber } from '../get-subscriber';

@Injectable()
export class DeleteSubscriberCredentials {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private subscriberRepository: SubscriberRepository,
    private integrationRepository: IntegrationRepository,
    private analyticsService: AnalyticsService,
    private getSubscriberUseCase: GetSubscriber
  ) {}

  async execute(command: DeleteSubscriberCredentialsCommand): Promise<void> {
    const foundSubscriber = await this.getSubscriberUseCase.execute(
      GetSubscriberCommand.create({
        ...command,
      })
    );

    const foundIntegration = await this.integrationRepository.findOne(
      {
        _environmentId: command.environmentId,
        providerId: command.providerId,
      },
      '_id'
    );

    if (!foundIntegration) {
      throw new NotFoundException(
        `Subscribers environment (${command.environmentId}) do not have ${command.providerId} integration.`
      );
    }

    await this.deleteSubscriberCredentials(
      foundSubscriber.subscriberId,
      command.environmentId,
      foundIntegration._id,
      foundSubscriber._id
    );

    this.analyticsService.mixpanelTrack('Delete Subscriber Credentials - [Subscribers]', '', {
      providerId: command.providerId,
      _organization: command.organizationId,
      _subscriberId: foundSubscriber._id,
    });
  }

  private async deleteSubscriberCredentials(
    subscriberId: string,
    environmentId: string,
    integrationId: string,
    _subscriberId: string
  ) {
    await this.invalidateCache.invalidateByKey({
      key: buildSubscriberKey({
        subscriberId: subscriberId,
        _environmentId: environmentId,
      }),
    });

    return await this.subscriberRepository.updateOne(
      {
        _id: _subscriberId,
        _environmentId: environmentId,
      },
      { $pull: { channels: { _integrationId: integrationId } } }
    );
  }
}
