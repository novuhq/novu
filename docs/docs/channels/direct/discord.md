# Discord

On some channels as the Direct one, the user will need to add his provider integration credentials in order to provide Novu the right authorization to send the notification by his behave.

We will provide the basic flow that the user needs to perform in order to successfully send notifications via the Direct channel.

1. Go to the channel you want to add the webhook to
2. Right click the channel and select "Edit Channel"
3. Integrations -> Webhooks -> New webhook
4. Copy webhook URL

  ```typescript
  import { Novu, DirectProviderIdEnum} from '@novu/node'

  const novu = new Novu(process.env.NOVU_API_KEY);

  await novu.subscribers.setCredentials('subscriberId', DirectProviderIdEnum.Discord, {
    webhookUrl: 'https://discord.com/api/webhooks/...',
  });
  ```

- subscriberId is a custom identifier used when identifying your users within the Novu platform.
- providerId is a unique provider identifier, we recommend using our DirectProviderIdEnum in our case its Slack.
- credentials are the argument you need to be authentication with your provider workspace. At this point, we support direct messages through webhook, so a webhookUrl is needed.

<!-- markdownlint-disable MD029 -->
10. You are all set up and ready to send your first direct message via our `@novu/node` package novu.trigger or the API!
<!-- markdownlint-enable MD029 -->
