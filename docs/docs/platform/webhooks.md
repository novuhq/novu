---
sidebar_position: 9
---

# Webhooks

Novu provides an URL that you can use to setup webhook support for your integrated provider.
This enables to receive much more detailed information from the provider about the outgoing messages in the [Activity Feed](/platform/activity-feed) section.

Currently, only `Email` and `SMS` channels are supported with limited providers.
Support for more providers will be added in future.

## Get your Webhook URL

To get your provider specific webhook URL, follow the below steps:

- Open your already connected provider from the `Integration Store` page.
- Scroll down the modal to find the `Webhook URL` field.
- Copy the given URL to configure it on the provider's webhook setup page.

![Webhook URL](/img/webhook-url.png)

**Note**: Webhook URL will only be visible for connected providers and after you've connected the provider.

## Supported Providers

- Mailjet
- Mandrill
- Postmark
- Sendgrid
- Sendinblue
- Telnyx
- Twilio
