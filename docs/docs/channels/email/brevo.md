---
sidebar_position: 3
---

# Brevo

You can use the [Brevo](https://www.brevo.com/) (formally Sendinblue) provider to send transactional emails to your customers using the Novu Platform with a single API.

## Getting Started

To use the Brevo provider in the email channel, you will need to create a Brevo account and add your API key to the Brevo integration on the Novu platform.

## Find the API Key

- To find your Brevo API key, log into your Brevo account and navigate to the [API Keys](https://app.brevo.com/settings/keys/smtp) page.

## Authenticate your sender identity

Before you can send emails on a large scale, you will need to authenticate your sender's identity. This is due to the latest regulatory changes regarding SPAM rules and email fraud. Most of the providers including Brevo require you to authenticate your sender identity before you can send emails.

Brevo allows you to authenticate your sender identity using one of the following methods:

- [Single Sender Verification](https://app.brevo.com/senders) - This is the easiest way to authenticate your sender identity.
- [Entire Domain Authentication](https://help.brevo.com/hc/en-us/articles/115000185270-What-is-a-verified-domain-on-Sendinblue-) - This is recommended if you are sending emails from multiple accounts under your domain.

## Create a Brevo integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Brevo and click on the **Connect** button.
- Enter your Brevo API key.
- Fill the `From email address` field using the authenticated email from the previous step.
- Click on the `Disabled` button and mark as `Active`.
- Click on the **Connect** button.
- You should now be able to send notifications using Brevo in Novu.
