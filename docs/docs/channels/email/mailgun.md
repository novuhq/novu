---
sidebar_position: 10
---

# Mailgun

You can use the [Mailgun](https://mailgun.com/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use the Mailgun channel, you will need to create a Mailgun account and add your API key and domain name to the Mailgun integration on the Novu platform.

## Generate API Key

To generate a new API key in Mailgun, you can follow these steps:

- [Sign up](https://signup.mailgun.com/new/signup) or [Log in](https://login.mailgun.com/login/) to your Mailgun account.
- Click on the **Profile** section in the top right corner of the screen, and then click "API Keys" from the drop-down menu.
- On the [API Keys](https://app.mailgun.com/app/account/security/api_keys) page, copy the generated **Private API Key**

## Add new domain name

Mailgun recommends that you add a subdomain as a domain name. To do so:

- Visit the page to add a [domain name](https://app.mailgun.com/app/sending/domains/new).
  - During this process, you will need to choose a region for the domain name which is between `US` and `EU`. The default is `US`.
- Follow the [instructions](https://documentation.mailgun.com/en/latest/user_manual.html#verifying-your-domain-1) to verify the domain name.

## Create a Mailgun integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Mailgun and click on the **Connect** button.
- Enter your Mailgun API Key.
- Enter your Base URL.
  - For domains created in the EU region, the base URL is: `https://api.eu.mailgun.net/`
  - Otherwise, leave the base URL blank.
- Fill the `Username`.
- Fill the `Domain name` registered on Mailgun.
- Fill the `From email address` field using the authenticated email from the previous step.
- Fill the `Sender name`.
- Click on the `Disabled` button and mark as `Active`.
- Click on the **Connect** button.
- You should now be able to send notifications using Mailgun in Novu.
