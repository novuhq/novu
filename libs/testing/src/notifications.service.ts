import axios from 'axios';
import { ChannelTypeEnum } from '@novu/shared';
import { MessageRepository } from '@novu/dal';

export class NotificationsService {
  private messageRepository = new MessageRepository();

  constructor(private token: string) {}

  async triggerEvent(name: string, subscriberId: string, payload = {}) {
    await axios.post(
      'http://localhost:1336/v1/events/trigger',
      {
        name,
        to: subscriberId,
        payload,
      },
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );
  }
}
