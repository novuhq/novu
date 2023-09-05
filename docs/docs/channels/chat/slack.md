import FAQ from '@site/src/components/FAQ';
import FAQItem from '@site/src/components/FAQItem';

# Slack

When using Slack you will have to save the integration credentials on the subscriber entity.

This guide will walk you through the steps needed to obtain the `webhookUrl` that Novu requires to send chat messages to your customers.

We will provide the basic flow that the user needs to perform, to successfully send notifications via the Slack integration.

## Application Creation

This step is optional, if you already have a Slack application you can reuse it.

1. Go to Slack's developer dashboard [https://api.slack.com/apps](https://api.slack.com/apps).
2. Create a new application.

## Generation of Webhook Urls for your subscribers

### Novu Managed (Recommended)

Novu will manage the OAuth flow and store the credentials

1. Configure your Slack application as mentioned [below](/channels/chat/slack#slack-application-configuration).
2. Add the `Add to Slack` button or the `Shareable URL` to your application in order to request permission of access (scope: incoming-webhook).

   Make sure you use the generated `Shareable URL` that you can find under Slack integration form in the <a href="https://web.novu.co/integrations" style={{textDecoration: "underline"}}>Integration Store</a>.
   The `Shareable URL` should have the following format:

   ```bash
   https://api.novu.co/v1/subscribers/SUBSCRIBER_ID/credentials/slack/oauth?environmentId=ENVIRONMENT_ID&integrationIdentifier=INTEGRATION_IDENTIFIER.
   ```

   - SUBSCRIBER_ID is a custom identifier used when identifying your users within the Novu platform. [Read more here](/platform/subscribers). <br/>
   - ENVIRONMENT_ID is a context of an environment you can locate your environment id in the setting in the dashboard. <a href="https://web.novu.co/settings" style={{textDecoration: "underline"}}>Settings</a>.
     <br/>
   - INTEGRATION_IDENTIFIER optional, is a unique identifier of the integration. You can locate your integration identifier in the <a href="https://web.novu.co/integrations" style={{textDecoration: "underline"}}>Integration Store</a>. When not provided the last created integration will be used.

If you are using the `Add to Slack` button you have to provide the `Shareable URL` as the `redirect_uri` parameter like in this example. Make sure that the `Shareable URL` is url encoded.

```html
<a
  href="https://slack.com/oauth/v2/authorize?client_id=CLIENT_ID&scope=incoming-webhook&user_scope=&redirect_uri=https%3A%2F%2Fapi.novu.co%2Fv1%2Fsubscribers%2FSUBSCRIBER_ID%2Fcredentials%2Fslack%2Foauth%3FenvironmentId%3DENVIRONMENT_ID%26integrationIdentifier%3DINTEGRATION_IDENTIFIER"
  ><img
    alt="Add to Slack"
    height="40"
    width="139"
    src="https://platform.slack-edge.com/img/add_to_slack.png"
    srcset="
      https://platform.slack-edge.com/img/add_to_slack.png    1x,
      https://platform.slack-edge.com/img/add_to_slack@2x.png 2x
    "
/></a>
```

### Manual Management

<FAQ>
<FAQItem title="Instructions on configuring https server">

Create a new endpoint on your server that will handle the following steps (you can use Request Bin for an easy HTTPS service for redirects):

1. Listen for redirect requests to your endpoint (REDIRECT_URL) after the user completes step 5 and grants permissions. Make sure to store the 'code' parameter from the request query as it will be needed later.
2. Send a POST request to <https://slack.com/api/oauth.v2.access> with the following request body:
   Use the "Client ID" and "Client Secret" from Slack's Developer Dashboard under "Basic Information". The request body should be in the format: { code: string, client_id: string, client_secret: string }.
   Store the webhook URL from the response, which can be found under `response.data.incoming_webhook.url`.
   (read more on Slack's documentation here)
3. When the `incoming_webhook.url` is obtained you need to save it on the relevant subscriber entity in Novu you can use the Node SDK:

   ```typescript
   import { Novu, ChatProviderIdEnum } from '@novu/node';

   const novu = new Novu(process.env.NOVU_API_KEY);

   const body = req.body; // From your HTTPS listener
   await novu.subscribers.setCredentials('subscriberId', ChatProviderIdEnum., {
     webhookUrl: body.incoming_webhook.url,
   });
   ```

   - subscriberId is a custom identifier used when identifying your users within the Novu platform. [Read more here](/platform/subscribers).
   - providerId is a unique provider identifier. We recommend using our ChatProviderIdEnum.Slack if you're using Node, else string of `slack` to specify the provider.
   - The third parameter is the credentials object. In this case we use the webhookUrl property to specify the webhook URL generated in the previous step.

   :::info
   You need to set credentials for every subscriber because Slack generates a new Webhook URL on every new app install.
   :::

4. Configure your Slack application as mentioned [below](/channels/chat/slack#slack-application-configuration).
5. Add the `Add to Slack` button or the shareable URL to your application in order to request permission of access (scope: incoming-webhook).
6. After the end-user finishes the authorization you will get the webhookUrl from the response of the OAuth under `body.incoming_webhook.url`, that you will use in step 3.
7. You are all set up and ready to send your first chat message via our @novu/node package or directly using the REST API.

</FAQItem>
</FAQ>

## Slack Application Configuration

1. Go to OAuth & Permissions on Slack's Developer Dashboard and add your REDIRECT_URL in Redirect URLs.
   - If you use a manual Management solution, add the API endpoint you created on [step 1](/channels/chat/slack#manual-manage).
   - If you use Novu Managed solution add https:<span/>//api.novu.co/v1/subscribers/.
2. Go to Incoming Webhooks from the left menu and Activate Incoming Webhooks.
3. Go to Manage Distribution and at the bottom of the page, tick Remove Hard Coded Information and Activate Public Distribution.

### Enabling HMAC Encryption

In order to enable Hash-Based Message Authentication Codes, you need to do the following steps:

1. Visit the integration store page and enable HMAC encryption under your chat provider.
2. Next step would be to generate an HMAC encrypted subscriberId on your backend:

   ```ts
   import { createHmac } from 'crypto';

   const hmacHash = createHmac('sha256', process.env.NOVU_API_KEY)
     .update(subscriberId)
     .digest('hex');
   ```

3. Add the newly created hash HMAC to the Sharable URL as a query.
