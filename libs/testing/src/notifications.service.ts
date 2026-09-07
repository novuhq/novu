import axios from 'axios';

export class NotificationsService {
  constructor(
    private token: string,
    private environmentId: string
  ) {}

  async triggerEvent(name: string, subscriberId: string, payload = {}) {
    await axios.post(
      'http://127.0.0.1:1336/v1/events/trigger',
      {
        name,
        to: subscriberId,
        payload,
      },
      {
        headers: {
          /*
           * TODO: In a more realistic testing scenario events/trigger is mostly called using the Novu secret key
           * in a machine-to-machine setup instead of a user bearer JWT.
           *
           * In future work, we should replace the JWT with an API key and simplify testing preparation.
           */
          Authorization: `Bearer ${this.token}`,
          'Novu-Environment-Id': this.environmentId,
        },
      }
    );
  }
}
