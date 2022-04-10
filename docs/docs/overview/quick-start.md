---
sidebar_position: 2
---
# Quick Start

After creating your cloud or self-hosted account the next steps to sending your first notification are outlined in this guide.

- Connect your providers
- Create a notification template
- Send a trigger
- Integrate the Notification Center within your app *(optional)*

## Connect providers

In the “**Integration Store**” page you can configure the different providers and their respective credentials. During the alpha phase only a **single provider** is allowed **per-channel,** adding a second email provider will de-activate the previously added provider.

## Create a notification template

After creating the designated channel provider you can create your notification template. You can think of the notification template as the blueprint for the notifications that will be sent. The template includes:

- Notification details
- Channel specific content
- Trigger definition

### Notification Details

This section will contain the metadata for your notification, things such as name, description and group.

The **name** of the notifications will be converted to a slug and will be used as the trigger identifier used when sending the trigger from back-end.

### Channel specific content

#### Email

You can specify the content for email in two ways:

**Visual template builder** - For simple usecases you can use our visual template editor with limited control over design but easier to get-started.


**Custom Code** - You can use the custom code section to specify custom html that will be used for the email.

You can specify custom variables using the [{{handlebars}}](https://handlebarsjs.com/guide/) syntax.

#### SMS

Similiar to the the email, custom variables using hbs syntax can be described to create the final message.

#### In-app

In the notification center preview you can type the content, you can select content an use `CMD` + `B` to make the selected text bold.

## Trigger the notification

After creating the template trigger will be generated, use the server SDK in your application in the appropriate place for the specific trigger.

### Passing variables

The second argument contains an object with custom variables used in the template, some variables are system variables and they will begin with a “**$**”:

- **$user_id** - a unique identifier for the user, this can be your internal DB id or the user email. Make sure that this variable is unique.
- **$email** - The email address of the user.
- **$phone** - The user’s phone address with a country prefix (+)
- **Custom variables -**  can be added here and used within the template.
