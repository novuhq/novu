---
sidebar_position: 10
sidebar_label: Ruby
---

# Ruby Quickstart

Learn how to use Novu to quickly send multi-channel (SMS, Email, Chat, Push) notifications from a Ruby app.

In this Quickstart guide, you’ll learn how to:

- [Ruby Quickstart](#ruby-quickstart)
  - [Requirements](#requirements)
  - [Install Novu Ruby SDK](#install-novu-ruby-sdk)
  - [Initialize \& Configure the Novu Ruby SDK](#initialize--configure-the-novu-ruby-sdk)
  - [Set Up A Channel Provider](#set-up-a-channel-provider)
  - [Create A workflow](#create-a-workflow)
  - [Create A Subscriber](#create-a-subscriber)
  - [Trigger A Notification](#trigger-a-notification)
  - [Topics](#topics)
    - [Create a Topic](#create-a-topic)
    - [Add and Remove subscribers to a Topic](#add-and-remove-subscribers-to-a-topic)
    - [Sending a notification to a Topic](#sending-a-notification-to-a-topic)
  - [Next Steps](#next-steps)

## Requirements

To follow the steps in this quickstart, you'll need:

- A Novu account. [Sign up for free](http://web.novu.co) if you don’t have one yet.
- A working Ruby development environment with at least version 2.6.0.

You can also [view the completed code](https://github.com/novuhq/novu-ruby-quickstart) of this quick start in a GitHub repo.

## Install Novu Ruby SDK

The [Ruby SDK](http://github.com/novuhq/novu-ruby) provides a fluent and expressive interface for interacting with Novu's API and managing notifications.

You can install the client library via RubyGems:

```ruby
gem install novu
```

Or add it to your Gemfile:

```ruby
gem 'novu'
```

Then run `bundle install`.

## Initialize & Configure the Novu Ruby SDK

To use the library, Create a new file `index.rb` then initialize the client with your API token:

```ruby
require 'novu'

client = Novu::Client.new('YOUR_NOVU_API_KEY')
```

Replace the `YOUR_NOVU_API_KEY` argument with the authentic key from the **API Key** section of your [Novu Dashboard](https://web.novu.co/settings).

:::info
Please do not hardcode your credentials in a file in production. Use environment variables instead.
:::

To test your API key, call the methods on the client to interact with the Novu API and display the result on your ruby console:

```ruby
puts client.notifications
```

Run the file `index.rb`:

```bash
ruby index.rb
```

You should see a result as below:

```json
{
  "page": 0,
  "totalCount": 0,
  "pageSize": 10,
  "data": []
}
```

## Set Up A Channel Provider

A channel provider is a service that provides one or more notification functionality such as sending an email, SMS, push notification etc. Our [integration store](https://web.novu.co/integrations) includes four channels: Email, SMS, Chat, and Push. These channels have multiple providers associated with them.

| Channel | Providers                                                           |
| ------- | ------------------------------------------------------------------- |
| Email   | MailGun, Mandrill, MailJet, Amazon SES, Sendgrid, Postmark, Netcore |
| SMS     | Twilio, Amazon SNS, Plivo, SMS, SMSCentral, Kannel, Infobip, Termii |
| Chat    | Mattermost, Slack, Microsoft Teams, Discord                         |
| Push    | FCM, APNS, Expo                                                     |

Only one provider can be **active** per **channel**. Connect any of your favorite providers to get started. The email channel comes with Novu's email provider, which is active by default and includes 300 credits.

## Create A workflow

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
   ![click workflow](https://res.cloudinary.com/dxc6bnman/image/upload/v1688745999/guides/workflows_m60hkc.png)
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

```ruby
require 'novu'

client = Novu::Client.new('YOUR_NOVU_API_KEY')

# Create subscriber

create_payload = {
    'subscriberId' => '7789', # replace with system_internal_user_id
    'firstName' => 'John', # optional
    'lastName' => 'Doe', # optional
}
client.create_subscriber(create_payload)
```

Run the code in your terminal:

```bash
ruby index.rb
```

You should see the subscriber on your Novu dashboard.

![Recently created subscriber](https://res.cloudinary.com/dxc6bnman/image/upload/f_auto,q_auto/v1685466979/guides/Screenshot_2023-05-14_at_11.06.38_ugvmc0.png)

I’d like to publicly announce that `abc@gmail.com` is a random unlikely email your users will have. To update this to an alternative email, you can call the `updateSubscriber` method like so:

```ruby
require 'novu'

client = Novu::Client.new('YOUR_NOVU_API_KEY')

# Update subscriber detail

update_payload = {
    'email' => 'validemail@gmail.com',  # replace with valid email
    'firstName' => '<insert-firstname>', # optional
    'lastName' => 'Obasanjo', # optional
}
client.update_subscriber('7789', update_payload);
```

Other valid fields that can be updated are `phone`, `avatar`, and `data`. The `data` field can accept an object of metadata that you want to attach to the subscriber.

::::info
To make all of your app users subscribers, you need to programmatically add them to Novu.
::::

## Trigger A Notification

Copy and paste the following code into your app to trigger a notification:

```ruby
require 'novu'

client = Novu::Client.new('YOUR_NOVU_API_KEY')

# trigger a notification

trigger_payload = {
    'name' => 'Trigger1',
    'payload' => {
        'first-name' => 'Adam'
    },
    'to' => {
        'subscriberId' => '7789'
    }
}
client.trigger_event(trigger_payload)
```

Before running the code, make sure you understand the following:

- The value of `name` should be the notification workflow’s trigger ID/slug.

![Notification Template](https://res.cloudinary.com/dxc6bnman/image/upload/f_auto,q_auto/v1685466980/guides/trigger_id_1_ur1azh.png)

- The value of `payload` is an array of the data that you want to be dynamically injected into the notification workflow content.
- The value of `subscriberId` is the id of the subscriber on Novu. Replace `7789` with your subscriber ID.

Run the code to trigger a notification!

```bash
ruby index.rb
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

```ruby
require 'novu'

client = Novu::Client.new('YOUR_NOVU_API_KEY')
# Create a Topic

create_topic_payload = {
    'key'  => 'frontend-users',
    'name' => 'All frontend users'
}
client.create_topic(create_topic_payload)
```

Before running the code, make sure you understand the following:

- When creating a `key`, ensure it is unique and accurately identifies the topic. Document naming conventions and communicate them to team members to avoid confusion and ensure a smooth workflow.
- The value of `name` should be a descriptive topic name.

### Add and Remove subscribers to a Topic

Copy and paste the following code into your app to add subscribers to a topic:

```ruby
require 'novu'

client = Novu::Client.new('YOUR_NOVU_API_KEY')

topicKey = 'frontend-users'
subscribers = ['6460925ce1a93324257d2fc1', '7789'].to_s

# Add subscribers to a topic
client.add_subscribers(topicKey, subscribers)
```

Also, you can remove subscribers from a topic by using the code snippet below:

```ruby
require 'novu'

client = Novu::Client.new('YOUR_NOVU_API_KEY')

topicKey = 'frontend-users'
subscribers = ['6460925ce1a93324257d2fc1', '7789'].to_s

# Remove subscribers from a topic
client.remove_subscribers(topicKey, subscribers)
```

### Sending a notification to a Topic

Thanks to the topics feature, it is possible to trigger a notification to all subscribers assigned to a topic. This helps avoid listing all subscriber identifiers in the `to` field of the notification trigger.

To trigger a notification to all subscribers of a topic, copy and paste the code below:

```ruby
require 'novu'

client = Novu::Client.new('YOUR_NOVU_API_KEY')

# Send notifications to a topic (all frontend users)
client.trigger_event({
    'name' => 'Trigger1',
    'to' => {
        'type' => 'Topic',
        'topicKey' => 'frontend-users'
    }
})
```

::::info
The value of the `name` key in the payload should be the name of the notification created earlier ([Trigger A Notification](#trigger-a-notification) section)
::::

## Next Steps

Great job! If you've reached this point, you should now have successfully created a subscriber, notification workflow, configured a channel provider and triggered a notification in your application.

To learn more about notifications and explore Novu's features and capabilities, check out:

- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
- [Novu Ruby SDK](https://github.com/novuhq/novu-ruby) - Delve deeper into the SDK and explore a lot of features.
- [Novu Notification Center](https://docs.novu.co/notification-center/getting-started) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
