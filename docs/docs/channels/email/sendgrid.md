# SendGrid

You can use the [SendGrid](https://sendgrid.com/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use the Sendgrid channel, you will need to create a Sendgrid account and add your API key to the SendGrid integration on the Novu platform.

## Find the API Key

To find your Sendgrid API key, log into your Sendgrid account and navigate to the [API Keys](https://app.sendgrid.com/settings/api_keys) page.
It is suggested that you create a new API key for use with Novu. To successfully send emails, you will need to add the following permissions to your API key:

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
- Click on the **Save** button.
- You should now be able to send notifications using SendGrid in Novu.
