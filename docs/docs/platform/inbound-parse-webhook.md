---
sidebar_position: 12
---

# Inbound Parse Webhook

Inbound Webhook is a feature that allows processing of incoming emails for a domain or subdomain.
The feature parses the contents of the email and POSTs the information to a specified URL in a
multipart/form-data format.

:::info
This feature is available only in our SaaS. This feature will not work in self hosted environment.
:::

## To set up Inbound Webhook, follow these steps

1. Set up an MX Record:
   - Log in to your domain host's website and navigate to the MX Records page.
   - Create a new MX record for the subdomain you want to process incoming email (e.g. parse.yourdomain.com).
   - Assign the MX record a priority of 10 and point it to the specified inbound mail server that located on the admin dashboard on the Email Settings.
2. Add Domain to allowed list:
   - Log in to the dashboard.
   - Navigate to Email Settings in Settings.
   - Add your domain to the allowed list.
3. Enable Inbound Parse and Set Webhook URL:
   - Log in to the dashboard.
   - Navigate to the Notification Workflow Editor.
   - Select the email step.
   - Enable the Inbound Parse feature.
   - Set the Webhook URL to the location where you want the parsed data to be POSTed.

:::note
The Webhook URL must be publicly accessible.
:::
