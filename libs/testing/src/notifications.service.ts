import axios from 'axios';

export class NotificationsService {
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
