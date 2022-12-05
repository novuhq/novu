# MS Teams

MS Teams does not need any API Key or client ID to push messages in it. All it needs is the webhook url
to the channel you want to send messages to. That will be taken as the credentials.

Similarly to Discord, the credentials for this provider need to be stored on the subscriber entity.

## How to get a MS Teams webhook url

In order to get a webhook url linked to a specific channel, you should:

1. Click on the three dots button next to the channel name and select 'Connectors' option.
2. Search for the 'Incoming Webhook' connector and click on 'Configure'.
3. Set a name for the connector and click on the 'Create' button at the bottom.
4. A new url will be generated only for this channel. This is the credentials url you will need.

## Now, how do we connect our subscribers to MS Teams

Above url will be the target channel of some subscriber that you want to integrate with. To make this connection,
you have to:

1. Copy the url that you set up before
2. Update the subscriber credentials with this url using the MS Teams provider id:

You can do this step by using the `@novu/node` library

```typescript
import { Novu, ChatProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.setCredentials('SUBSCRIBER_ID', ChatProviderIdEnum.MsTeams, {
  webhookUrl: 'https://yourcompany.webhook.office.com/webhook...',
});
```

where:

- `subscriberId` is a custom identifier used when identifying your users within the Novu platform.
- `providerId` is a unique provider identifier, we recommend using our ChatProviderIdEnum to specify the provider.
- The third parameter is the credentials object, in this case we use the `webhookUrl` property to specify the MS Teams channel webhook URL.

or by calling the `Update Subscriber Credentials` endpoint on Novu API. Check endpoint details [here](https://docs.novu.co/api/update-subscriber-credentials/).

<!-- markdownlint-disable MD029 -->

3. You are all set up and ready to send your first chat message via our `@novu/node` package or directly using the REST API.
<!-- markdownlint-enable MD029 -->
