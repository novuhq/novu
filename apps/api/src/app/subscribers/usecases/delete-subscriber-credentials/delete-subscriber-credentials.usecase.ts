import { Injectable, NotFoundException } from '@nestjs/common';
import { buildSubscriberKey, InvalidateCacheService } from '@novu/application-generic';
import { SubscriberRepository } from '@novu/dal';
import { DeleteSubscriberCredentialsCommand } from './delete-subscriber-credentials.command';

@Injectable()
export class DeleteSubscriberCredentials {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: DeleteSubscriberCredentialsCommand): Promise<void> {
    const foundSubscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId,
      true,
      '_id subscriberId'
    );

    if (!foundSubscriber) {
      throw new NotFoundException(`Subscriber '${command.subscriberId}' was not found`);
    }

    await this.deleteSubscriberCredentialsOfOneProvider(
      foundSubscriber.subscriberId,
      command.environmentId,
      command.providerId,
      foundSubscriber._id
    );
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
