import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { ISubscriberJwt } from '@novu/shared';

interface IUpdateSubscriberPayload {
  isOnline: boolean;
  lastOnlineAt?: string;
}

@Injectable()
export class SubscriberOnlineService {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async handleConnection(subscriber: ISubscriberJwt) {
    const isOnline = true;

    await this.updateOnlineStatus(subscriber, { isOnline });
  }

  async handleDisconnection(subscriber: ISubscriberJwt, activeConnections: number) {
    const lastOnlineAt = new Date().toISOString();
    let isOnline = false;

    if (activeConnections > 1) {
      isOnline = true;
    }

    await this.updateOnlineStatus(subscriber, { isOnline, lastOnlineAt });
  }

  private async updateOnlineStatus(subscriber: ISubscriberJwt, updatePayload: IUpdateSubscriberPayload) {
    await this.subscriberRepository.update(
      { _id: subscriber._id, _environmentId: subscriber.environmentId },
      {
        $set: updatePayload,
      }
    );
  }
}
