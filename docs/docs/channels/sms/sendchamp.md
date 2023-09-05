# Sendchamp

You can use the [Sendchamp](https://www.sendchamp.com/) provider to send SMS messages to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use Sendchamp provider in the SMS channel, the first step is to create a Sendchamp account and add your API key and Sender ID to the Sendchamp integration on the Novu platform.

## Retrieve your API Key

To find your Sendchamp API key:

- [Sign up](https://my.sendchamp.com/signup) or [Login](https://my.sendchamp.com/login) to your Sendchamp account.
- Click on the Avatar icon in the top right corner of the screen, and then click `API & Integrations` from the drop-down menu.

![Image displaying how to access the API Key from the Avatar Icon dropdown](/img/providers/sms/sendchamp/avatar-api-key.png)

Alternatively, you can access the API key from the Accounts menu.

- Scroll to the bottom of the sidebar (on the left) and click on `Accounts`.
- This will display a dropdown from which you can then click on `API keys & Webhooks` to view your API key.

![Image displaying how to access the API Key from the Accounts menu dropdown](/img/providers/sms/sendchamp/accounts-menu-api-key.png)

- On the API Keys page, copy the `Public access key`.

![Image displaying the access the API Key on the API Keys page](/img/providers/sms/sendchamp/api-key.png)

## Get your Sender's ID

The Sender ID represents the sender of the message to your customers.

To get your Sender's ID:

- On the sidebar (on the menu on your left), click on `SMS`. This will display a dropdown. Click on `Sender ID` from the dropdown options.
- On the page that appears, you'll find a list of your Sender IDs

![Image showing SMS page where you can view the list of your Sender IDs](/img/providers/sms/sendchamp/sender-id.png)

If you have not created one yet:

- Click on the `Create sender ID` button to request for a Sender ID.
- Fill in the form.
- Click on `Add sender ID` button.

![Image showing the form that allows you to request for Sender ID on Sendchamp](/img/providers/sms/sendchamp/sender-id-request-form.png)

Once it is approved, you can use your Sender ID as the `from` field on the Novu platform.

## Create a Sendchamp integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate **Sendchamp** under SMS section and click on the **Connect** button.

![Image showing Novu web platform integration store page](/img/providers/sms/sendchamp/web.png)

- Enter your Sendchamp API Key.
- Fill the `From` field.
- Click on the **Connect** button.

![Sendchamp integration modal on Novu’s web integration page](/img/providers/sms/sendchamp/integration.png)

Now it is possible to send SMS notifications using **Sendchamp** in Novu.
