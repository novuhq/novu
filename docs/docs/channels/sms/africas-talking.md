# Africa's Talking

You can use [Africa's Talking](https://africastalking.com/) provider to send SMS messages to your customers using the Novu Platform with a single API to create multi-channel experiences.

## Getting Started

To use Africa's Talking provider in the SMS channel, the first step is to create an Africa's Talking account and add your API key, username and Sender's ID to Africa's Talking integration on the Novu platform.

## Create a username

You’ll need to create an application to create a username in Africa’s Talking. To do so, follow the steps below:

- [Sign up](https://account.africastalking.com/auth/register) or [Log in](https://account.africastalking.com/auth/login) to your Africa's Talking account.

- Select the team you want your app to be in.

![Image showing Africa’s talking dashboard and a red arrow pointing to a team with text that says “Click Here”](/img/providers/sms/africas-talking/create-a-username-1.png)

If you're a new user and don't have a team yet, you'll have to do so by clicking on `New Team` and entering your team name. Click on `Save` when you're done.

![Image showing the modal to add a new team on Africa’s Talking dashboard](/img/providers/sms/africas-talking/create-a-username-1-1.png)

- On the page that appears, click on the `Create App` button.

![Image showing the modal to add a new team on Africa’s Talking dashboard](/img/providers/sms/africas-talking/create-an-app-button.png)

- On the pop up that appears, enter your application name, username and select a country. Then click Save.

The `username` is what you will use on the Novu platform.

![Image showing the modal to add a new team on Africa’s Talking dashboard](/img/providers/sms/africas-talking/create-an-app.png)

## Generate API key

To generate a new API key, you can follow these steps:

:::note
Ensure you have created an app in your team.
:::

- Click on the app you created.

![Image show Africa’s Talking dashboard with a red arrow pointing to an app name](/img/providers/sms/africas-talking/click-app.png)

- On the page that appears, click on `Settings`(on the menu on your left). This will display a dropdown. Click on `API Key` from the dropdown options.

![Image displaying the Settings menu and the API Key page](/img/providers/sms/africas-talking/settings-menu.png)

- On the page that appears, enter your password and click Generate.

![Image showing page to generate API key on Africa’s Talking platform](/img/providers/sms/africas-talking/generate-api-key.png)

- Copy the API Key generated and paste it into the Novu platform or record it somewhere safe for later use because you will not see it from the dashboard on subsequent visits.

:::note
Once you've generated your API Key, wait about 3 minutes before testing it.
:::

## Get your Sender's ID

Sender IDs allow you to brand your messages as you send them to your customers. There are two kinds of sender IDs, **short codes** and **alphanumerics**. The difference is that you can send and receive messages with short codes but only send messages with alphanumerics.

To create a Short Code:

- On your app dashboard, click on SMS (on the menu on your left). This will display a dropdown. Click on `Shortcodes` from the dropdown options. This will also display a dropdown from which you can then click on `My Shortcodes` to view your codes.

![Image showing Africa’s Talking dashboard page where you create shortcodes for sending SMS](/img/providers/sms/africas-talking/short-codes.png)

If you have not yet created one yet, on the `Shortcodes` dropdown option, click on `Request`.

On the page that appears, fill in the form and submit

![Image showing the dashboard page that allows you to request for shortcodes on Africa’s Talking](/img/providers/sms/africas-talking/request-short-codes.png)

To create an Alphanumeric:

- On your app dashboard, click on SMS (on the menu on your left). This will display a dropdown. Click on `Alphanumerics` from the dropdown options. This will also display a dropdown from which you can then click on `My Alphanumerics` to view your codes.

![Image showing Africa’s Talking dashboard page where you create an alphanumeric for sending SMS](/img/providers/sms/africas-talking/alphanumeric.png)

If you have not yet created one yet, on the `Alphanumerics` dropdown option, click on `Request`.

On the page that appears, fill in the form and submit

![Image showing the dashboard page that allows you to request for an alphanumeric on Africa’s Talking](/img/providers/sms/africas-talking/request-alphanumeric.png)

Once you're done, add either your short code or alphanumeric to the `from` field on the Novu platform.

## Create an Africa's Talking integration with Novu

- Visit the [Integrations](https://web.novu.co/integrations) page on Novu.
- Locate **Africa's Talking** under the SMS section and click on the **Connect** button.

![Image showing Novu web platform integration store page](/img/providers/sms/africas-talking/integration.png)

- Enter the `API key`.
- fill in the `username` field.
- fill in the `from` field. This is your registered `short code` or `alphanumeric` value.
- Click on the `Disabled` button and mark as `Active`.
- Click on the **Connect** button.

![Africa’s Talking integration modal on Novu’s web integration page](/img/providers/sms/africas-talking/web.png)

Now it is possible to send SMS notifications using **Africa's Talking** in Novu.
