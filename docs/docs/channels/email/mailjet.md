# Mailjet

You can use the [Mailjet](https://mailjet.com/) provider to send transactional emails to your customers using the Novu Platform with a single API.

## Getting Started

To use the Mailjet channel, you will need to create a Mailjet account and add your API key to the Mailjet integration on the Novu platform.

## Find the API Key

To find your Mailjet API key, log into your Mailjet account and navigate to the [API Keys](https://app.mailjet.com/account/apikeys) page.
It is suggested that you create a new API key for use with Novu. To successfully send emails, you will need to add the following permissions to your API key:

## Authenticate your sender identity

Before you can send emails on a large scale, you will need to authenticate your Sender identity. This is due to the latest regulatory changes regarding SPAM rules and email fraud. Most of the providers including Mailjet require you to authenticate your Sender identity before you can send emails.

Mailjet allows you to authenticate your sender identity using one of the following methods:

- [Single Sender Verification](https://dev.mailjet.com/email/guides/senders-and-domains/#sender-validation) - This is the easiest way to authenticate your sender identity.
- [Entire Domain Authentication](https://dev.mailjet.com/email/guides/senders-and-domains/#spf-and-dkim-validation) - This is recommended if you are sending emails from multiple accounts under your domain.

## Create a Mailjet integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Mailjet and click on the **Connect** button.
- Enter your Mailjet API key.
- Fill the `From email address` field using the authenticated email from the previous step.
- Click on the **Save** button.
- You should now be able to send notifications using Mailjet in Novu.
