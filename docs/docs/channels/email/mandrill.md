---
sidebar_position: 11
---

# Mandrill

You can use the [Mandrill by Mailchimp](https://mandrillapp.com/) provider to send transactional emails to your customers using the Novu Platform with a single API.

## Getting Started

To use the Mandrill provider, you will need to create a Mandrill account and add your API key to the Mandrill integration on the Novu platform.

## Generate API Key

To generate a new API key in Mandrill, you can follow these steps:

- [Sign up](https://login.mailchimp.com/signup/) or [Log in](https://login.mailchimp.com/) to your Mandrill account.
- Navigate to the [Settings](https://mandrillapp.com/settings) of your account and look for the API Keys section at the bottom of the settings page.
- Click on the **+ Add API Key** button to create an API key. Copy the generated key immediately and store it in a secure location. You won’t be able to see or copy the key once you finish generating it.

# Add a sending domain

To get started, you’ll need to add the domain that you want to send messages from.

- Navigate to [Settings page](https://mandrillapp.com/settings/sending-domains) and choose Domains
- Type a new domain in the domain input and click Add
- Follow the instructions to [verify ownership](https://mailchimp.com/developer/transactional/docs/authentication-delivery/#authentication) of your sending domain and [update your DNS records](https://mailchimp.com/developer/transactional/docs/authentication-delivery/#configure-your-dns).

## Create the Mandrill integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Mandrill and click on the **Connect** button.
- Enter your Mandrill API key.
- Fill the `From email address` field using the authenticated email from the previous step.
- Fill the `Sender name`.
- Click on the `Disabled` button and mark as `Active`.
- Click on the **Connect** button.
- You should now be able to send notifications using Mandrill in Novu.
