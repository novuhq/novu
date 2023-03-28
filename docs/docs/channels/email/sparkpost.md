---
sidebar_position: 5
---

# SparkPost

You can use the [SparkPost](https://messagebird.com/email/cloud-sending) provider to send transactional emails to your customers using the Novu Platform with a single API.

## Getting Started

To use the SparkPost channel, you will need to create a SparkPost account and add your API key to the SparkPost integration on the Novu platform.

## Generate API Key

To generate a new API key in SparkPost, you can follow these steps:

- [Sign up](https://app.sparkpost.com/join) or [Log in](https://app.sparkpost.com/auth) to your SparkPost account.

  > During sign up, note that SparkPost is available in multiple regions. "SparkPost" refers to the SparkPost service hosted in North America. "SparkPost EU" refers to the SparkPost service hosted in Western Europe. An account created with SparkPost cannot be used with SparkPost EU, and vice-versa. You may use accounts in both regions.<br/> ~ [_SparkPost Documentation_](https://support.sparkpost.com/docs/getting-started/getting-started-sparkpost/)

- Click on the **Configuration** link on the navbar, and then click "API Keys" link that pops up from the available options.
- On the [API Keys](https://app.sparkpost.com/account/api-keys) page, click the **Create API Key** button.
- Give the API key a name and click on the **Create API key** button.
- Copy the generated API Key.

## Authenticate your Sender Identity

Before you can send emails on a large scale, you will need to authenticate your Sender Identity.

SparkPost allows you to authenticate your sender identity using [Sending Domains](https://app.sparkpost.com/domains/list/sending).

## Create a SparkPost integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate SparkPost and click on the **Connect** button.
- Enter your SparkPost API Key.
- Fill the `From email address` field using the authenticated email from the previous step.
- Fill the `Sender name`.
- Toggle the `eu` switch to true if you're in Western Europe
- Click on the `Disabled` button and mark as `Active`.
- Click on the **Connect** button.
- You should now be able to send notifications using SparkPost in Novu.
