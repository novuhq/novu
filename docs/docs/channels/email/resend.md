---
sidebar_position: 4
---

# Resend

You can use the [Resend](https://resend.com/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use the Resend provider in the email channel, you will need to create a Resend account and add your API key to the Resend integration on the Novu platform.

## Generate API Key

To generate a new API key in Resend, you can follow these steps:

- [Sign up](https://resend.com/secret) or [Log in](https://resend.com/login) to your Resend account.
- Click on the **API Keys** link in the left sidebar, and then click "Create API Key" button on the top right part of the page.
- On the [API Keys](https://resend.com/api-keys) page, click the **Create API Key** button.
- Give the API key a name and click on the **Add** button.
- Copy the generated API Key.

## Authenticate your Sender Identity

Before you can send emails on a large scale, you will need to authenticate your Sender Identity.

Resend allows you to authenticate your sender identity using [Domain Authentication](https://resend.com/docs/dashboard/domains/introduction).

## Create a Resend integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Resend and click on the **Connect** button.
- Enter your Resend API Key.
- If you have verified your domain in previous step, fill the `From email address` field with any domain email address. For example, if your organization domain name is `linear.app` then you can use any valid email address like `hello@linear.app`.
  - For testing, you can use `onboarding@resend.dev` if you have not authenticated your sender identity.
- Fill the `Sender name`.

:::info
Resend does not support sender name field separately. To show your preferred `Sender Name` in emails, enter `Team Linear <hello@linear.app>` in `From email address` field instead of `hello@linear.app`. Here **Team Linear** is `Sender Name`.
:::

- Click on the `Disabled` button and mark as `Active`.
- Click on the **Connect** button.
- You should now be able to send notifications using Resend in Novu.
