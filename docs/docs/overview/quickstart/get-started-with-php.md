---
sidebar_position: 2
sidebar_label: PHP
---

# PHP Quickstart

Learn how to use Novu to quickly send multi-channel (SMS, Email, Chat, Push) notifications from a PHP app.

In this Quickstart, you’ll learn how to:

- [PHP Quickstart](#php-quickstart)
  - [Requirements](#requirements)
  - [Install Novu PHP SDK](#install-novu-php-sdk)
    - [Initialize \& Configure the Novu SDK](#initialize--configure-the-novu-sdk)
  - [Set Up A Channel Provider](#set-up-a-channel-provider)
  - [Create A Notification Workflow](#create-a-notification-workflow)
  - [Create A Subscriber](#create-a-subscriber)
  - [Trigger A Notification](#trigger-a-notification)
  - [Topics](#topics)
    - [Create a Topic](#create-a-topic)
    - [Add subscribers to a Topic](#add-subscribers-to-a-topic)
    - [Sending a notification to a Topic](#sending-a-notification-to-a-topic)
  - [Next Steps](#next-steps)

## Requirements

To follow the steps in this quickstart, you'll need:

- A Novu account. [Sign up for free](http://web.novu.co) if you don’t have one yet.
- A working PHP development environment with a PHP version of 7.2+.

You can also [v](https://cloudinary.com/documentation/php_quickstart#view_the_completed_code)[iew the completed code](https://github.com/novuhq/novu-php-quickstart) of this quick start in a GitHub repo.

## Install Novu PHP SDK

The [PHP SDK](http://github.com/novuhq/novu-php) provides a fluent and expressive interface for interacting with Novu's API and managing notifications.

Now install the Novu PHP SDK by running the following command in your terminal:

```bash
composer install unicodeveloper/novu
```

Otherwise, create a file named `composer.json` and add the following to it:

```php
{
    "require": {
        "unicodeveloper/novu": "^1.0"
    }
}
```

Next, install the SDK by running the following `composer` command:

```bash
composer install
```

### Initialize & Configure the Novu SDK

Create a new file, `index.php` in your application and add the following code to it:

```php
<?php

  require('vendor/autoload.php');

  use Novu\SDK\Novu;

  $apiKey = '<YOUR_NOVU_API_KEY>';
  $novu = new Novu($apiKey);
```

Replace the `$apiKey`’s value with the authentic key from the **API Key** section of your [Novu Dashboard](https://web.novu.co/settings).

:::info
Please do not hardcode your credentials in a file in production. Use environment variables instead.
:::

## Set Up A Channel Provider

A channel provider is a service that provides one or more notification functionality such as sending an email, SMS, push notification etc. Our [integration store](https://web.novu.co/integrations) includes four channels: Email, SMS, Chat, and Push. These channels have multiple providers associated with them.

| Channel | Providers                                                           |
| ------- | ------------------------------------------------------------------- |
| Email   | MailGun, Mandrill, MailJet, Amazon SES, Sendgrid, Postmark, Netcore |
| SMS     | Twilio, Amazon SNS, Plivo, SMS, SMSCentral, Kannel, Infobip, Termii |
| Chat    | Mattermost, Slack, Microsoft Teams, Discord                         |
| Push    | FCM, APNS, Expo                                                     |

Only one provider can be **active** per **channel**. Connect any of your favorite providers to get started. The email channel comes with Novu's email provider, which is active by default and includes 300 credits.

## Create A Notification Workflow

A notification workflow is the blueprint for the notifications that will be sent. It holds the entire flow of messages sent to the subscriber. This is where all the different channels are tied together under a single entity.

The workflow includes the following:

- Notification workflow name and Identifier
- Channel tailored content:

| Channel | Content Style                                                                                 |
| ------- | --------------------------------------------------------------------------------------------- |
| Email   | 1. Custom Code (HTML) with option to use custom variables via the handlebars , {{ }}, syntax. |
|         | 2. Click and place UI items with the visual template editor.                                  |
| SMS     | Text with the option to use handlebars syntax, {{ }} to inject custom variables.              |
| Chat    | Text with the option to use handlebars syntax, {{ }} to inject custom variables.              |
| In-App  | Text                                                                                          |

:::info
Proper authorization needs to be set for the Chat channel for subscribers.
:::

Please proceed to create a notification workflow.

1. Click **Workflows** on the left sidebar of your Novu dashboard.
2. Click the **Create Workflow** button on the top right.
3. The name of a new notification workflow is currently **Untitled.** Rename it to a more suitable title.
4. Select **Email** as the channel you want to add.
   ![Select Email as Channel](https://res.cloudinary.com/dxc6bnman/image/upload/f_auto,q_auto/v1685466071/guides/set-email_1_aisoz4.png)
5. Click on the recently added channel, fill the email subject and click **Update**.
   ![Update](https://res.cloudinary.com/dxc6bnman/image/upload/f_auto,q_auto/v1685466074/guides/update_email_template_1_exxybg.png)
6. Click on the **Test** tab and send a test email to verify your notification workflow.

![Test](https://res.cloudinary.com/dxc6bnman/image/upload/f_auto,q_auto/v1685466786/guides/send_test_email_1_goyknt.png)

You should get an email within seconds. Yaaay, you have successfully sent your first notification via the Novu dashboard!

Now, let’s take it a step further to trigger notifications via code.

## Create A Subscriber

The recipients of a triggered notification are called subscribers.

Click **Subscribers** on the left sidebar of the Novu dashboard to see all subscribers. By default, the dashboard will display a subscriber, as you were added automatically during sign-up.

![Subscribers](https://res.cloudinary.com/dxc6bnman/image/upload/f_auto,q_auto/v1685466791/guides/subscriber_id_1_hitnrk.png)

Now, let's create a subscriber on Novu. Copy and paste the following code to do so:

```php
// Create subscriber
$novu->createSubscriber([
    'subscriberId' => '7789', // replace with system_internal_user_id
    'email' => 'abc@gmail.com',
    'firstName' => 'John', // optional
    'lastName' => 'Doe', // optional
])->toArray();
```

Run the code in your terminal like so:

```bash
php index.php
```

You should see the subscriber on your Novu dashboard.

![Recently created subscriber](https://res.cloudinary.com/dxc6bnman/image/upload/f_auto,q_auto/v1685466979/guides/Screenshot_2023-05-14_at_11.06.38_ugvmc0.png)

I’d like to publicly announce that `abc@gmail.com` is a random unlikely email your users will have. To update this to an alternative email, you can call the `updateSubscriber` method like so:

```php
// Update subscriber detail
$subscriberId = '7789';
$novu->updateSubscriber($subscriberId, [
    'email' => 'validemail@gmail.com',  // replace with valid email
    'firstName' => '<insert-firstname>', // optional
    'lastName' => '<insert-lastname>', // optional
])->toArray();
```

Other valid fields that can be updated are `phone`, `avatar`, and `data` . The `data` field can accept an array of metadata that you want to attach to the subscriber.

::::info
To make all of your app users subscribers, you need to programmatically add them to Novu.
::::

## Trigger A Notification

Copy and paste the following code into your app to trigger a notification:

```php
$novu->triggerEvent([
    'name' => 'first-email',
    'payload' => ['first-name' => 'Adam'],
    'to' => [
        'subscriberId' => '7789'
    ]
])->toArray();
```

Before running the code, make sure you understand the following:

- The value of `name` should be the notification workflow’s trigger ID/slug.

![Notification Template](https://res.cloudinary.com/dxc6bnman/image/upload/f_auto,q_auto/v1685466980/guides/trigger_id_1_ur1azh.png)

- The value of `payload` is an array of the data that you want to be dynamically injected into the notification workflow content.
- The value of `subscriberId` is the id of the subscriber on Novu. Replace `7789` with your subscriber ID.

Run the code to trigger a notification!

```php
php index.php
```

Next, we’ll learn how to send notifications to different groups of subscribers easily via **Topics.**

## Topics

Novu provides a simple API that offers an easy interface for triggering notifications to multiple subscribers at once. This API is called **Topics** and allows users to manage their bulk notifications without having to implement complex loops.

A topic is identified by a custom key and this key will be the identifier used when triggering notifications. You can assign a name to a topic for descriptive purposes. This name does not need to be unique and can be changed programmatically.

::::info
The topic key should be unique and can't be changed once chosen. Novu also safe guards for key uniqueness behind the scenes.
::::

A topic can have multiple subscribers who will receive a notification whenever a message is sent to the topic.

### Create a Topic

Copy and paste the following code into your app to create a topic:

```php
// Create a Topic
$novu->createTopic([
  'key'  => 'frontend-users',
  'name' => 'All frontend users'
]);
```

Before running the code, make sure you understand the following:

- When creating a `key`, ensure it is unique and accurately identifies the topic. Document naming conventions and communicate them to team members to avoid confusion and ensure a smooth workflow.
- The value of `name` should be a descriptive topic name.

### Add subscribers to a Topic

Copy and paste the following code into your app to add subscribers a topic:

```php
$topicKey = 'frontend-users';
$subscribers = [
    '6460925ce1a93324257d2fc1',
    '7789'
];

// Add subscribers to a topic
$novu->topic($topicKey)->addSubscribers($subscribers);
```

On the other hand, if you want to remove subscribers from a topic, do the following:

```php
$topicKey = 'frontend-users';
$subscribers = [
    '6460925ce1a93324257d2fc1',
    '7789'
];

// Remove subscribers from a topic
$novu->topic($topicKey)->removeSubscribers($subscribers);
```

### Sending a notification to a Topic

Thanks to the topics feature, it is possible to trigger a notification to all subscribers assigned to a topic. This helps avoid listing all subscriber identifiers in the `to` field of the notification trigger.

To trigger a notification to all subscribers of a topic, copy and paste the code below:

```php
// Send notifications to a topic (all frontend users)
$novu->triggerEvent([
    'name' => 'first-email',
    'to' => [
       [
         'type' => 'Topic',
         'topicKey' => 'frontend-users'
       ]
    ]
])->toArray();
```

## Next Steps

Great job! If you've reached this point, you should now have successfully created a subscriber, notification workflow, configured a channel provider and triggered a notification in your application.

To learn more about notifications and explore Novu's features and capabilities, check out:

- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
- [Novu PHP SDK](https://github.com/novuhq/novu-php) - Delve deeper into the SDK and explore a lot of features.
- [Novu Notification Center](https://docs.novu.co/notification-center/getting-started) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
