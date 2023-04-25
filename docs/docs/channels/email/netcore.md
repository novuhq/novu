---
sidebar_position: 12
---

# Netcore

You can use the [Netcore](https://netcorecloud.com/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use the Netcore channel, you will need to create a Netcore account and add your API key to the Netcore integration on the Novu platform.

## Generate API Key

To generate a new API key in Netcore, you can follow these steps:

- [Log in](https://email.netcorecloud.com/) to your Netcore account.
- Go to the **Integration** page under **Settings** menu and click on the **API** tab.
- The API Key is hidden for security purpose. Click Show. System will prompt you to enter your account password. Once you enter the password, the API key will be accessible.

## Set up sending domains

To start sending emails, you need to add and verify your sending domains. You can either use your top-level domain (e.g. my-company.com) or a sub-domain like email.my-company.com. The verification is done to ensure your sending domain’s security.

Follow the instructions on this [page](https://emaildocs.netcorecloud.com/docs/what-is-a-sending-domain-how-to-set-up-sending-domains) to get started

## Create a Netcore integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Netcore and click on the **Connect** button.
- Enter your Netcore API Key.
- Fill the `From email address` field using the authenticated email from the previous step.
- Fill the `Sender name`.
- Click on the `Disabled` button and mark as `Active`.
- Click on the **Connect** button.
- You should now be able to send notifications using Netcore in Novu.
