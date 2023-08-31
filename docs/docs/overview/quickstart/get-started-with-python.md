---
sidebar_position: 12
sidebar_label: Get started with Python
---

# Python Quickstart

Welcome to Python Quickstart guide for Novu. In this guide, you'll learn how to use Novu in a Python application. Novu is a powerful notification service that enables you to send multi-channel (SMS, Email, Chat, Push) notifications. Let's see how you can seamlessly integrate Novu into your Python project!

## Prerequisites

Before diving into the Quickstart, make sure you have the following:

- Python3 installed on your development machine.
- A Novu account. If you don't have one, sign up for free at [web.novu.co](https://web.novu.co)

### Install and Set Up Novu in your Python Project

First, you must install the Novu package in your Python project. From your terminal, you can install the Novu package in your project by running either of the following two commands:

Via pip

```bash
pip install novu
```

Via poetry

```bash
poetry add novu
```

Once installed, you can import Novu into your project and initialize it using your Novu account credentials. This step establishes a connection between your app and the Novu notification service.

```python
from novu.config import NovuConfig

NovuConfig().configure("https://api.novu.co", "<YOUR_NOVU_API_KEY>")
```

Replace the `<YOUR_NOVU_API_KEY>` value with the authentic key from the **API Key** section of your [Novu Dashboard](https://web.novu.co/settings).

:::info
Please do not hardcode your credentials in a file in production. Use environment variables instead.
:::

## Set Up A Channel Provider

A channel provider is a service that lets you use one or more notification channels such as sending an email, SMS, push notification etc. Our integration store currently supports four channels: Email, SMS, Chat, and Push. Each of these channels have multiple providers associated with them.

| Channel | Providers                                                           |
| ------- | ------------------------------------------------------------------- |
| Email   | MailGun, Mandrill, MailJet, Amazon SES, Sendgrid, Postmark, Netcore |
| SMS     | Twilio, Amazon SNS, Plivo, SMS, SMSCentral, Kannel, Infobip, Termii |
| Chat    | Mattermost, Slack, Microsoft Teams, Discord                         |
| Push    | FCM, APNS, Expo                                                     |

Only one provider can be **active** per **channel** at a time. Connect anyone of your preferred providers to get started. The email channel comes with Novu's email provider, which is active by default and includes 300 credits.

## Create a Notification Workflow

A notification workflow is the blueprint for the notifications that will be sent. It holds the entire flow of messages sent to the subscriber.

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

To create a notification workflow, please follow the following steps:

1. Click “Workflows” on the left sidebar of your Novu dashboard.
2. Click the “Create Workflow” button on the top right.
3. Select 'blank workflow' from the dropdown.
4. The name of a new workflow is currently "Untitled." Rename it to a suitable title.
5. Select any channel you want to use in your app. For the sake of this guide, we'll be using the 'Email' channel.
   ![set-email.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776583/set-email_wavtrn.png)

6. Click on the recently added channel, fill the email subject and click “Update”.
   ![update_email_template.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776583/update_email_template_ivn0jv.png)

7. Click on the “Test” tab and send a test email to verify your notification workflow.
   ![send_test_email.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776583/send_test_email_ngzmth.png)

You should get an email within seconds. If you didn't, please check your 'spam' folder as sometimes test emails can end up there. Yaaay, you have successfully sent your first notification via the Novu dashboard!

Now, let’s take it a step further to trigger notifications via code.

## Create A Subscriber

The recipients of a triggered notification are called subscribers.

Click “Subscribers” on the left sidebar of the Novu dashboard to see all subscribers. By default, the dashboard will display only one subscriber, as you were added automatically during sign-up.

![subscriber_id.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1688331839/Screenshot_2023-07-03_at_0.02.53_jmkhi3.png)

Now, let's create a subscriber on Novu. Copy and paste the following code to do so:

```python
# Create a subscriber

from novu.api.subscriber import SubscriberApi
from novu.dto.subscriber import SubscriberDto

your_subscriber_id = "123" # Replace this with a unique user ID.

# Define a subscriber instance
subscriber = SubscriberDto(
   subscriber_id=your_subscriber_id,
   email="abc@gmail.com",
   first_name="John",
   last_name="Doe"
)

SubscriberApi().create(subscriber)
```

Run the code in your terminal like so:

```bash
python main.py # replace main.py with your file name
```

You should see a new subscriber (that you created above) on your Novu dashboard.

## Update A Subscriber

To update the Subscriber details you can call the put method from SubcriberApi. Here is an example:

```python
# Update subscriber detail

from novu.api.subscriber import SubscriberApi
from novu.dto.subscriber import SubscriberDto

subscriber = SubscriberDto(
   subscriber_id="123",
   email="new.abc@gmail.com",
   first_name="New",
   last_name="Name"
)

SubscriberApi().put(subscriber)
```

<aside>
Note: To send notifications to all your users, you'll need to make them subscribers in Novu, which you can do by programmatically adding them to Novu.

</aside>

## Trigger A Notification

Copy and paste the following code into your app to trigger a notification:

```python
from novu.api import EventApi

EventApi().trigger(
    name="test",  # The trigger ID of the workflow. It can be found on the workflow page.
    recipients="123",
    payload={},  # Your Novu payload goes here
)
```

Before running the code, make sure you understand the following:

- The value of `name` should be the notification workflow's trigger ID/slug.

![trigger_id.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776585/trigger_id_xkhsx7.png)

- The value of `payload` is an array of the data that you want to be dynamically injected into the notification template content.
- The value of `recipients` is the id of the subscriber on Novu. Replace `123` with your subscriber ID.

Run the code to trigger a notification!

```bash
python main.py # replace main.py with your file name
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

```python
from novu.api import TopicApi

# Create a topic
TopicApi().create(
    key="new-customers", name="New business customers"
)
```

Before running the code, make sure you understand the following:

- When creating a `key`, ensure it is unique and accurately identifies the topic. Document naming conventions and communicate them to team members to avoid confusion and ensure a smooth workflow.
- The value of `name` should be a descriptive topic name.

### Add subscribers to a Topic

Copy and paste the following code into your app to add subscribers a topic:

```python
from novu.api import TopicApi

# Add a list of subscribers to a topic
TopicApi().subscribe(key="new-customers", subscribers="<LIST_OF_SUBSCRIBER_IDs>")
```

On the other hand, if you want to remove subscribers from a topic, do the following:

```python
from novu.api import TopicApi

# Unsubscribe a list of subscribers from a topic
TopicApi().unsubscribe(key="new-customers", subscribers="<LIST_OF_SUBSCRIBER_IDs>")
```

### Sending a notification to a Topic

Thanks to the topics feature, it is possible to trigger a notification to all subscribers assigned to a topic. This helps avoid listing all subscriber identifiers.

To trigger a notification to all subscribers of a topic, copy and paste the code below:

```python
from novu.api import EventApi
from novu.dto.topic import TriggerTopicDto

topics = TriggerTopicDto(
   topic_key="new-customers",
   type="Topic",
)

EventApi().trigger_topic(
    name="test",  # The trigger ID of the workflow. It can be found on the workflow page.
    topics=topics,
    payload={},  # Your Novu payload goes here
)
```

## Next Steps

Great job! If you've reached this point, you should now have successfully set up a channel provider, created a notification workflow, created a subscriber, updated a subscriber and triggered a notification in your application.

To learn more about notifications and explore Novu's features and capabilities, check out:

- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
- [Novu Python SDK](https://github.com/novuhq/novu-python) - Delve deeper into the SDK and explore a lot of features.
- [Novu Notification Center](https://docs.novu.co/notification-center/getting-started) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
