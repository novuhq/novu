# Email.js

You can use the [Email.js](https://www.emailjs.com/) provider to send transactional emails to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use the Email.js channel, you will need to create a Email.js account and add your API key to the Email.js integration on the Novu platform.

## Find the API Key

To find your Email.js API key, log into your Email.js account and navigate to the [API Keys](https://dashboard.emailjs.com/admin/account) page.
It is suggested that you create a new API key for use with Novu. To successfully send emails, you will need to add the following permissions to your API key:

## Authenticate your sender identity

All email services require some sort of authentication to send the emails on your behalf. That makes it a bad idea to use them directly from client-side – revealing your password or your secret keys will allow anyone to send emails on your behalf.

Email.js keeps your authentication details on the server-side, and the client-side code just triggers a predefined email template, similarly to how any client-server application is working.

## Create a Email.js integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate Email.js and click on the **Connect** button.
- Enter your Email.js API Key.
- Fill the `From email address` field using the authenticated email from the previous step.
- Click on the **Save** button.
- You should now be able to send notifications using Email.js in Novu.
