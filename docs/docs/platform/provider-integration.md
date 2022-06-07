# Provider Integrations

On some channels as the Direct one, the user will need to add his provider integration credentials in order to provide Novu the right authorization to send the notification by his behave.

## Slack
We will provide the basic flow that the user need to perform in order to successfully send notification via direct channel.
1. Go to slack API client https://api.slack.com/apps
2. Create new application.
3. Go to incoming-webhooks and Activate Incoming Webhooks
4. Create a HTTPS server listen on REDIRECT_URL 
where you will send a POST request to URL `https://slack.com/api/oauth.v2.access` with the following params:
   1. the `code` from the request object (request.queryParams.code).
   2. `client_id` and `client_secret` that are located in your `Basic Information`section in the api.slack.com client.
5. Go to`OAuth & Permissions` and add your REDIRECT_URL in Redirect URLs.
6. Go to `Manage Distribution`, at the bottom of the page make sure to tick the `Remove Hard Coded Information` and `Activate  Public Distribution`.
7. Add the `Add to Slack` button or the Sharable URL to your application.
8. After the end-user finished the authorization set the response webhook-url result with Novu via Novu package interface.

