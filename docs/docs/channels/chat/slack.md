# Slack

When using Slack you will have to save the integration credentials on the subscriber entity.

This guide will walk you through the steps needed to obtain the `webhookUrl` that Novu requires to send chat messages to your customers.

We will provide the basic flow that the user needs to perform, to successfully send notifications via the Slack integration.

## Application Setup

1. Go to Slack's developer dashboard [https://api.slack.com/apps](https://api.slack.com/apps).
2. Create a new application.
3. Go to `Incoming Webhooks` from the left menu and Activate Incoming Webhooks.
4. (Optional) To test your integration with your workspace, you could generate a test webhook here.

## Generate webhooks for your users

1. On your server add a new endpoint that will listen to the response redirect from a POST request to `https://slack.com/api/oauth.v2.access` (read more on Slack's documentation [here](https://api.slack.com/authentication/oauth-v2#asking))
2. Go to `OAuth & Permissions` on Slack's developer dashboard and add your REDIRECT_URL in Redirect URLs. (You can use [Request Bin](https://requestbin.com/) for an easy HTTPS service for redirects)
3. Go to `Manage Distribution` and at the bottom of the page make sure to tick `Remove Hard Coded Information` and `Activate Public Distribution`.
4. Add the `Add to Slack` button or the shareable URL to your application.
5. After the end-user finishes the authorization you can get the `webhookUrl` from the response of the OAuth under `body.incoming_webhook.url`.
6. When the `incoming_webhook.url` is obtained we can save it on the relevant subscriber entity in Novu:

```typescript
import { Novu, ChatProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

const body = req.body; // From your HTTPS listener
await novu.subscribers.setCredentials('subscriberId', ChatProviderIdEnum.Slack, {
  webhookUrl: body.incoming_webhook.url,
});
```

- `subscriberId` is a custom identifier used when identifying your users within the Novu platform.
- `providerId` is a unique provider identifier. We recommend using our ChatProviderIdEnum to specify the provider.
- The third parameter is the credentials object. In this case we use the `webhookUrl` property to specify the webhook URL generated in the previous step.

:::info
You need to set credentials for every subscriber because Slack generates a new Webhook URL on every new app install.
:::

<!-- markdownlint-disable MD029 -->

7. You are all set up and ready to send your first chat message via our `@novu/node` package or directly using the REST API.
<!-- markdownlint-enable MD029 -->
