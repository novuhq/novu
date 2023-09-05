# Termii

You can use the [Termii](https://termii.com/) provider to send SMS messages to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use Termii provider in the SMS channel, the first step is to create a Termii account and add your API key and Sender ID to the Termii integration on the Novu platform.

## Retrieving your API Key

To find your Termii API key:

- [Sign up](https://accounts.termii.com/#/register) or [Login](https://accounts.termii.com/#/login) to your Termii account.
- Navigate to your [dashboard](https://accounts.termii.com/#/).
- Then scroll to the bottom of the page to find your API key.

![Image displaying the API Key on the dashboard](/img/providers/sms/termii/api-key.png)

Alternatively, you can find the API key on the Settings page.

- Scroll to the bottom of the sidebar (on the left) and click on settings.
- This will display a dropdown from which you can then click on `API Token` to view your API key.

![Image displaying the API Key on the settings page](/img/providers/sms/termii/api-key-2.png)

## Get your Sender's ID

Sender IDs allow you to brand your messages as you send them to your customers.

To get your Sender's ID:

- On the sidebar (on the menu on your left), click on `Rental`. This will display a dropdown. Click on `SMS Sender IDs` from the dropdown options.
- On the page that appears, you'll find a list of your Sender IDs

![Image showing Rental page where you can view the list of your Sender IDs](/img/providers/sms/termii/sender-id.png)

If you have not created one yet:

- click on `Make a new request` button to request for a Sender ID.
- Fill in the form
- Click on `Save`

![Image showing the form that allows you to request for Sender ID on Termii](/img/providers/sms/termii/sender-id-request-form.png)

Once it is approved, you can use your Sender ID as the `from` field on the Novu platform.

## Create a Termii integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate **Termii** under SMS section and click on the **Connect** button.

![Image showing Novu web platform integration store page](/img/providers/sms/termii/integration.png)

- Enter your Termii API Key.
- Fill the `From` field.
- Click on the **Connect** button.

![Termii integration modal on Novu’s web integration page](/img/providers/sms/termii/web.png)

Now it is possible to send SMS notifications using **Termii** in Novu.
