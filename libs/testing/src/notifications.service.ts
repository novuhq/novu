import axios from 'axios';
import { ChannelTypeEnum } from '@novu/shared';
import { MessageRepository } from '@novu/dal';

export class NotificationsService {
  private messageRepository = new MessageRepository();

  constructor(private token: string) {}

  async triggerEvent(name: string, payload = {}) {
    await axios.post(
      'http://localhost:1336/v1/events/trigger',
      {
        name,
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
