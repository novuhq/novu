# Expo Push

[Expo Push](https://docs.expo.dev/push-notifications/overview/) is a notification delivery service provided by Expo.

To enable Expo Push integration, you need to create an [Expo Application Services (EAS)](https://expo.dev) account and generate an access token in the EAS dashboard.

The overrides field supports all [Message Request](https://docs.expo.dev/push-notifications/sending-notifications/#message-request-format) values, example below:

<Tabs>
  <TabItem value="nodejs" label="Node.js" default>

```ts
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

novu.trigger('event-name', {
  to: {
    subscriberId: '...',
  },
  payload: {
    abc: 'def',
  },
});
```

  </TabItem>
</Tabs>

Before triggering the notification to a subscriber(user) with push as a step in the workflow, make sure you have added the subscriber's device token as follows:

```typescript
import { Novu, PushProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

const body = req.body; // From your HTTPS listener
await novu.subscribers.setCredentials('subscriberId', PushProviderIdEnum.EXPO, {
  deviceTokens: ['token1', 'token2'],
});
```
