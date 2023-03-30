---
sidebar_position: 4
---

# Resend

You can use the [Resend](https://resend.com/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use the Resend channel, you will need to create a Resend account and add your API key to the Resend integration on the Novu platform.

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
- Fill the `From email address` field using the authenticated email from the previous step.
  - For testing, you can use `onboarding@resend.dev` if you have not authenticated your sender identity.
- Fill the `Sender name`.
- Click on the `Disabled` button and mark as `Active`.
- Click on the **Connect** button.
- You should now be able to send notifications using Resend in Novu.
