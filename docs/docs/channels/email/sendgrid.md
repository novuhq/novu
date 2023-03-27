---
sidebar_position: 1
---

# SendGrid

You can use the [SendGrid](https://sendgrid.com/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use the Sendgrid channel, you will need to create a Sendgrid account and add your API key to the SendGrid integration on the Novu platform.

## Generate API Key

To generate a new API key in SendGrid, you can follow these steps:

- Log in to your SendGrid account.
- Click on the **Settings** gear icon in the top right corner of the screen, and then click "API Keys" from the drop-down menu.
- On the API Keys page, click the **Create API Key** button.
- Give the API key a name and select the following permissions

-**Mail Send** - Full Access

- (Optional) Template Engine - Read Only

- Click the **Create & View** button to generate the API key. The key will be displayed on the screen, but you will only be able to view it once, so make sure to save it in a safe place.

:::note
The access level of key will determine what actions the API Key can take, so please choose the correct one.
:::

- **Mail Send** - Full Access
- (Optional) Template Engine - Read Only

## Authenticate your [Sender Identity](https://docs.sendgrid.com/for-developers/sending-email/sender-identity)

Before you can send emails on a large scale, you will need to authenticate your Sender Identity. This is due to the latest regulatory changes regarding SPAM rules and email fraud. Most of the providers including Sendgrid require you to authenticate your Sender Identity before you can send emails.

SendGrid allows you to authenticate your sender identity using one of the following methods:

- [Single Sender Verification](https://docs.sendgrid.com/ui/sending-email/sender-verification) - This is the easiest way to authenticate your sender identity.
- [Entire Domain Authentication](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication) - This is recommended if you are sending emails from multiple accounts under your domain.

## Create a SendGrid integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate SendGrid and click on the **Connect** button.
- Enter your SendGrid API Key.
- Fill the `From email address` field using the authenticated email from the previous step.
- Click on the `Disabled` button and mark as `Active`.
- Click on the **Connect** button.
- You should now be able to send notifications using SendGrid in Novu.
