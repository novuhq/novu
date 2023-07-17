---
sidebar_position: 14
---

# Plunk

You can use the [Plunk](https://useplunk.com/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use the Plunk provider in the email channel, you will need to create a Plunk account and add your API key to the Plunk integration on the Novu platform.

## Get API Key

To generate a new API key in Plunk, you can follow these steps:

- Log in to your Plunk account.
- Click on `Project Settings` on the side bar and then `API keys` on the tab.
- On the API Keys page, click on `Secret API key` to copy.

## Authenticate your sender identity

Before you can send emails on a large scale, you will need to authenticate your Sender Identity. Plunk allows you to authenticate your sender identity using [Domain Authentication](https://app.useplunk.com/settings/identity)

## Create a Plunk integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Plunk and click on the **Connect** button.
- Enter your Plunk secret API Key.
- Fill the `From email address` field using the authenticated email from the previous step.
- Click on the `Disabled` button and mark as `Active`.
- Click on the **Connect** button.
- You should now be able to send notifications using Plunk in Novu.
