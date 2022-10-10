# Postmark

You can use the [Postmark](https://postmarkapp.com/) provider to send transactional emails to your customers using the Novu Platform with a single API.

## Getting Started

To use the Postmark channel, you will need to create a Postmark account and add your API key to the Postmark integration on the Novu platform.

## Find the API Key

- To find your Postmark API key, log into your Postmark account and navigate to the servers page.
- After selecting the server of your choice, you will find your API key (referred to as "Server API tokens") in the "API Tokens" section of your server.

## Authenticate your sender identity

Before you send email in full scale, you will need to authenticate your sender's indentity. This is due to the latest regulatory changes regarding SPAM rules and email fraud. Most of the providers including Postmark require you to authenticate your sender identity before you can send emails.

Postmark allows you to authenticate your sender identity using one of the following methods:

- [Single Sender Verification](https://account.postmarkapp.com/signatures/new) - This is the easiest way to authenticate your sender identity.
- [Entire Domain Authentication](https://postmarkapp.com/support/article/1046-how-do-i-verify-a-domain#:~:text=be%20verified%20automatically.-,Navigate%20to%20Sender%20Signatures.,to%20your%20DNS%2C%20choose%20Verify.) - This is recommended if you are sending emails from multiple accounts under your domain.

## Create a Postmark integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Postmark and click on the **Connect** button.
- Enter your Postmark API key.
- Fill the `From email address` using the authenticated email from the previous step.
- Click on the **Save** button.
- You should now be able to send notifications using Postmark in Novu.
