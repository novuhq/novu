import { Injectable } from '@nestjs/common';
import { ISubscriberJwt } from '@novu/shared';
import { SubscriberRepository } from '@novu/dal';

@Injectable()
export class SubscriberOnlineService {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async handleConnection(subscriber: ISubscriberJwt) {
    const isOnline = true;
    const lastOnlineAt = new Date();
    await this.updateOnlineStatus(subscriber, isOnline, lastOnlineAt);
  }

  async handleDisconnection(subscriber: ISubscriberJwt, activeConnections: number) {
    const lastOnlineAt = new Date();
    let isOnline = false;
    if (activeConnections > 1) {
      isOnline = true;
    }

    await this.updateOnlineStatus(subscriber, isOnline, lastOnlineAt);
  }

  private async updateOnlineStatus(subscriber: ISubscriberJwt, isOnline: boolean, lastOnlineAt: Date) {
    await this.subscriberRepository.update(
      { _id: subscriber._id, _organizationId: subscriber.organizationId },
      {
        $set: {
          isOnline,
          lastOnlineAt,
        },
      }
    );
  }
}
