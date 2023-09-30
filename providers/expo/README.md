# Novu Expo Provider

A Expo push provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

The payload field supports all [Message Request](https://docs.expo.dev/push-notifications/sending-notifications/#message-request-format) values, example below.

```ts
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

novu.trigger('event-name', {
  to: {
    subscriberId: '...',
  },
  payload: {
    badge: 1, 
    sound: 'default',
    priority: 'high',
  },
});
```
