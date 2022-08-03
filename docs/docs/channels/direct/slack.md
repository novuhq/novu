# Slack

On some channels as the Direct one, the user will need to add his provider integration credentials in order to provide Novu the right authorization to send the notification by his behave.

We will provide the basic flow that the user need to perform in order to successfully send notification via direct channel.

1. Go to slack API client <https://api.slack.com/apps>
2. Create new application.
3. Go to incoming-webhooks and Activate Incoming Webhooks
4. Create a HTTPS server listen on REDIRECT_URL
where you will send a POST request to URL `https://slack.com/api/oauth.v2.access` with the following params:
   1. the `code` from the request object (request.queryParams.code).
   2. `client_id` and `client_secret` that are located in your `Basic Information`section in the api.slack.com client.
5. Go to`OAuth & Permissions` and add your REDIRECT_URL in Redirect URLs.
6. Go to `Manage Distribution`, at the bottom of the page make sure to tick the `Remove Hard Coded Information` and `Activate  Public Distribution`.
7. Add the `Add to Slack` button or the Sharable URL to your application.
8. After the end-user finished the authorization you can get the webhookUrl from the response of the OAuth under body.incoming_webhook.url.
9. Next you will need to update the newly created webhookUrl on Novu's environment, you can manage it through `@novu/node` package.

  ```typescript
  import { Novu, DirectProviderIdEnum} from '@novu/node'

  const novu = new Novu(process.env.NOVU_API_KEY);

  await novu.subscribers.setCredentials('subscriberId', DirectProviderIdEnum.Slack, {
    webhookUrl: 'webhookUrl',
  });
  ```

- subscriberId is a custom identifier used when identifying your users within the Novu platform.
- providerId is a unique provider identifier, we recommend using our DirectProviderIdEnum in our case its Slack.
- credentials are the argument you need to be authentication with your provider workspace. At this point, we support direct messages through webhook, so a webhookUrl is needed to be provided.

<!-- markdownlint-disable MD029 -->
10. You all set up and ready to send your first direct message via our `@novu/node` package novu.trigger or the API.
<!-- markdownlint-enable MD029 -->
