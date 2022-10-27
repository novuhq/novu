# Sendinblue

You can use the [Sendinblue](https://www.sendinblue.com/) provider to send transactional emails to your customers using the Novu Platform with a single API.

## Getting Started

To use the Sendinblue channel, you will need to create a Sendinblue account and add your API key to the Sendinblue integration on the Novu platform.

## Find the API Key

- To find your Sendinblue API key, log into your Sendinblue account and navigate to the [API Keys](https://account.sendinblue.com/advanced/api) page.

## Authenticate your sender identity

Before you can send emails on a large scale, you will need to authenticate your sender's identity. This is due to the latest regulatory changes regarding SPAM rules and email fraud. Most of the providers including Sendinblue require you to authenticate your sender identity before you can send emails.

Sendinblue allows you to authenticate your sender identity using one of the following methods:

- [Single Sender Verification](https://account.sendinblue.com/senders) - This is the easiest way to authenticate your sender identity.
- [Entire Domain Authentication](https://help.sendinblue.com/hc/en-us/articles/115000185270-What-is-a-verified-domain-on-Sendinblue-) - This is recommended if you are sending emails from multiple accounts under your domain.

## Create a Sendinblue integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Sendinblue and click on the **Connect** button.
- Enter your Sendinblue API key.
- Fill the `From email address` field using the authenticated email from the previous step.
- Click on the **Save** button.
- You should now be able to send notifications using Sendinblue in Novu.
