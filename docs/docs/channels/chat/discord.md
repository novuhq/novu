# Discord

When using Discord you will have to save the integration credentials on the subscriber entity. Discord supports two ways to do this:

1. Using the **Discord Webhook** integration.
2. Using the **Discord Bot** integration.

Right now Novu only supports the **Discord Webhook** integration, since the easiest way to set up is when you know in advance where the notifications should be sent. This is a common approach when you need to notify a particular channel about updates.

## Quickstart

Let's follow a simple guide on how you can generate a webhook token for testing purposes:

1. Go to the channel you want to add the webhook to
2. Right-click the channel and select "Edit Channel"
3. Integrations -> Webhooks -> New Webhook
4. Copy the webhook URL
5. Persist the webhook URL on the subscriber entity

```typescript
import { Novu, ChatProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.setCredentials('subscriberId', ChatProviderIdEnum.Discord, {
  webhookUrl: 'https://discord.com/api/webhooks/...',
});
```

- `subscriberId` is a custom identifier used when identifying your users within the Novu platform.
- `providerId` is a unique provider identifier. We recommend using our ChatProviderIdEnum to specify the provider.
- The third parameter is the credentials object. In this case, we use the `webhookUrl` property to specify the webhook URL generated in the previous step.

<!-- markdownlint-disable MD029 -->

6. You are all set up and ready to send your first chat message via our `@novu/node` package or directly using the REST API.
<!-- markdownlint-enable MD029 -->
