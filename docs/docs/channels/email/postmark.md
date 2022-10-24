# Postmark

Is it possible to use [Postmark](https://postmarkapp.com/) as a provider to send transactional emails to the customers using the Novu Platform with a single API.

## Getting Started

The first step to use the Postmark channel is to create a Postmark account and add the personal API key to the Postmark integration on the Novu platform.

## Find the API Key

- To find the Postmark API key, log into the personal Postmark account and navigate to the servers page.
- After selecting the server to use, the API key (referred to as "Server API tokens") will be in the "API Tokens" section of server chosen.

## Authenticate the sender identity

Due to the latest regulatory changes regarding SPAM rules and email fraud it is needed to authenticate the sender's identity before sending emails on a large scale.
Most of the providers, including Postmark, require an authentication to unlock the possibility of sending emails.

Postmark allows the authentication of the sender identity using one of the following methods:

- [Single Sender Verification](https://account.postmarkapp.com/signatures/new) - This is the easiest way to authenticate the sender identity.
- [Entire Domain Authentication](https://postmarkapp.com/support/article/1046-how-do-i-verify-a-domain#:~:text=be%20verified%20automatically.-,Navigate%20to%20Sender%20Signatures.,to%20your%20DNS%2C%20choose%20Verify.) - This is recommended for sending emails from multiple accounts under the same domain.

## Create a Postmark integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Postmark and click on the **Connect** button.
- Enter the Postmark API key.
- Fill the `From email address` field using the authenticated email from the previous step.
- Click on the **Save** button.
- Now is possible to send notifications using Postmark in Novu.
