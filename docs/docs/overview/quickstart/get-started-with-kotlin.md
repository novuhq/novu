---
sidebar_position: 9
sidebar_label: Kotlin
---

# Kotlin Quickstart

Learn how to integrate Novu into your Kotlin project on the fly and send notifications across different channels (SMS, Email, Chat, Push).

In this Quickstart, you will learn how to:

- [Kotlin Quickstart](#kotlin-quickstart)
  - [Requirements](#requirements)
  - [Install and Set up the Novu Kotlin SDK in your project](#install-and-set-up-the-novu-kotlin-sdk-in-your-project)
  - [Set up a Channel Provider](#set-up-a-channel-provider)
  - [Create a Notification Workflow](#create-a-notification-workflow)
  - [Create a Subscriber and Update a Subscriber's information](#create-a-subscriber-and-update-a-subscribers-information)
  - [Trigger a Notification](#trigger-a-notification)
  - [Topics](#topics)
    - [Create a Topic](#create-a-topic)
    - [Add subscribers to a Topic](#add-subscribers-to-a-topic)
    - [Sending a Notification to a Topic](#sending-a-notification-to-a-topic)
  - [Next Steps](#next-steps)

Let's get started! :muscle:

## Requirements

To be able to use this Quickstart, you would need to have the following:

- A Novu account, if you don't have one yet, [sign up](https://web.novu.co) for free.
- A working Kotlin project running version 1.6.0+ and Kotlin compiler 1.8.0+.

The completed code for this quick start is available on GitHub. Check it out [here](https://github.com/novuhq/novu-kotlin-quickstart).

## Install and Set up the Novu Kotlin SDK in your project

First, you need to import the library into your application.
If you use Maven, add the dependency to the `pom.xml` file;

```xml
<dependencies>
  ...
  <dependency>
    <groupId>io.github.crashiv</groupId>
    <artifactId>novu-kotlin</artifactId>
    <version>0.1.1-SNAPSHOT</version>
  </dependency>
</dependencies>
```

Then add the repository;

```xml
<repositories>
    ...
    <repository>
        <url>https://s01.oss.sonatype.org/content/repositories/snapshots/</url>
    </repository>
</repositories>
```

If you use Gradle, add the dependency to the `build.gradle` file;

```groovy
implementation 'io.github.crashiv:novu-kotlin:0.1.1-SNAPSHOT' //Groovy

implementation ("io.github.crashiv:novu-kotlin:0.1.1-SNAPSHOT") //Kotlin
```

Then add the repository;

```groovy
repositories {
    ...
    maven { url "https://s01.oss.sonatype.org/content/repositories/releases/" }
}
```

Sync your project, and you should have the artifacts downloaded.

To use the SDK, you need to have your API key handy, it can be gotten from [settings page](https://web.novu.co/settings) of the web portal.

To initialize the library, you can create an instance of `Novu.kt` class using any of the following constructors:

```kotlin
//Using the API Key only
val novu = Novu(apiKey = "API_KEY")
```

```kotlin
//Using the API Key plus an instance of NovuConfig
val novuConfig = NovuConfig(backendUrl = "URL")
val novu = Novu(apiKey = "API_KEY", config = novuConfig)
```

Once that is done successfully, head over to the [web portal](https://web.novu.co) for the next steps.

## Set up a Channel Provider

A channel provider is a service that provides one or more notification functionality such as sending an email, SMS, push notification, etc. Our [integration store](https://web.novu.co/integrations) includes four channels: Email, SMS, Chat, and Push. These channels have multiple providers associated with them.

| Channel | Providers                                                           |
| ------- | ------------------------------------------------------------------- |
| Email   | MailGun, Mandrill, MailJet, Amazon SES, Sendgrid, Postmark, Netcore |
| SMS     | Twilio, Amazon SNS, Plivo, SMS, SMSCentral, Kannel, Infobip, Termii |
| Chat    | Mattermost, Slack, Microsoft Teams, Discord                         |
| Push    | FCM, APNS, Expo                                                     |

Only one provider can be **active** per **channel**. Connect any of your favorite providers to get started. The email channel comes with Novu's email provider, which is active by default and includes 300 credits.

## Create a Notification Workflow

A notification workflow is the blueprint for the notifications that will be sent. It holds the entire flow of messages sent to the subscriber. This is where all the different channels are tied together under a single entity.

The workflow includes the following:

- Notification workflow name and Identifier.
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
   ![Creating a workflow in Novu dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127676/guides/SCR-20230630-pqdm_z5npqe.png)
3. The name of a new notification workflow is currently **Untitled**, rename it to a more suitable title.
   ![Renaming the newly created notification workflow](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127735/guides/SCR-20230630-pqpp_lvjfea.png)
4. Select **Email** as the channel you want to add, by dragging it from the right sidebar.
   ![Adding email channel to the notification workflow we created above](https://res.cloudinary.com/dxc6bnman/image/upload/v1688128047/guides/SCR-20230630-psgt_ottznp.png)
5. Click on the **Email** in the workflow and edit it as per this image. Don’t forget to add the fields in the editor which is supposed to be updated with dynamic values that will be sent when calling the API.
   ![Adding email and description to the editor in the notification workflow we created above](https://res.cloudinary.com/dxc6bnman/image/upload/v1688128150/guides/SCR-20230630-psxv_ef7jwh.png)
6. Also, add the variables in the **Variables** section in the test tab and try testing it by sending the email to your email address using the **Send Test Email** button at the bottom right.
   ![Adding variables to the 'variables' section](https://res.cloudinary.com/dxc6bnman/image/upload/v1688129220/guides/SCR-20230630-pzgl_n94giv.png)

You should get an email within seconds! :ok_hand:

Great, you have successfully sent your first notification via the Novu dashboard! Now, let’s take a step further to trigger notifications via code.

## Create a Subscriber and Update a Subscriber's information

The recipients of a triggered notification are called subscribers.

Click **Subscribers** on the left sidebar of the Novu dashboard to see all subscribers. By default, the dashboard will display a subscriber, as you were added automatically during sign-up.

![subscribers.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1688331839/Screenshot_2023-07-03_at_0.02.53_jmkhi3.png)

Now, let's create a subscriber on Novu. Copy and paste the following code to do so:

```kotlin
suspend fun createSubscriber(): ResponseWrapper<SubscriberResponse>? {
        val novu = Novu(apiKey = "API_KEY")
        val subscriberRequest = SubscriberRequest(
            email = "email@sample.com",
            firstName = "John",//optional
            lastName = "Doe",//optional
            phone = "123456789",//optional
            avatar = "sample-avatar",//optional
            subscriberId = "12345"//optional
        )
        return CoroutineScope(Dispatchers.IO).async {
            novu.createSubscriber(subscriberRequest)
        }.await()
    }
```

When you run this code snippet, you should see the subscriber on your Novu dashboard. :bust_in_silhouette:

Now, let's assume you want to modify the email address of the Subscriber you just created, you can do that with the following code:

```kotlin
suspend fun updateSubscriber(): ResponseWrapper<SubscriberResponse>? {
        val novu = Novu(apiKey = "API_KEY")
        val subscriberRequest = UpdateSubscriberRequest(
            email = "validemail@sample.com",
            firstName = "John",//optional
            lastName = "Doe",//optional
            phone = "123456789",//optional
            avatar = "sample-avatar"//optional
        )
        val subscriberId = "12345"
        return CoroutineScope(Dispatchers.IO).async {
            novu.updateSubscriber(subscriberId, subscriberRequest)
        }.await()
    }
```

Other valid fields that can be updated are `phone`, `avatar`, and `data`. The `data` field can accept an Object or a Map with the info you want to attach to the subscriber.

::::info
To create all of your subscribers, you need to programmatically add them to Novu.
::::

## Trigger a Notification

Copy and paste the following code into your app to trigger a notification to a Subscriber:

```kotlin
suspend fun triggerNotification(): Any? {
        val novu = Novu(apiKey = "API_KEY")
        val triggerEventRequest = TriggerEventRequest(
            name = "test",
            to = SubscriberRequest(
                subscriberId = "12345",
                email = "email@email.com",
                firstName = "John",
                lastName = "Doe"
            ),
            payload = mapOf("customVariables" to "Hello")
        )

        return CoroutineScope(Dispatchers.IO).async {
            novu.trigger(triggerEventRequest)
        }.await()
    }
```

Before running the code, make sure you understand the following:

- The value of `payload` is an array of the data that you want to be dynamically injected into the notification workflow content.
- The value of `subscriberId` is the ID of the subscriber on Novu. Replace `12345` with your subscriber ID.

Run the code to trigger a notification! :e-mail:

## Topics

Novu provides a simple API that offers an easy interface for triggering notifications to multiple subscribers at once. This API is called **Topics** and allows users to manage their bulk notifications without having to implement complex loops. A topic is identified by a custom key that is provided by the user, and this key will be the identifier used in the Topics API.

::::info
The topic key should be unique and can't be changed once chosen. Novu also caters for key uniqueness behind the scenes.
::::

A topic can have multiple subscribers who will receive a notification whenever a message is sent to the topic.

### Create a Topic

Copy and paste the following code into your app to create a topic:

```kotlin
suspend fun createTopic(): Any? {
        val novu = Novu(apiKey = "API_KEY")
        val createTopicRequest = CreateTopicRequest(
            key = "key",
            name = "name"
        )
        return CoroutineScope(Dispatchers.IO).async {
            novu.createTopic(createTopicRequest)
        }.await()
    }
```

Before running the code, make sure you understand the following:

- When creating a `key`, ensure it is unique and accurately identifies the topic. Document naming conventions and communicate them to team members to avoid confusion and ensure a smooth workflow.
- The value of `name` should be a descriptive topic name.

### Add subscribers to a Topic

Copy and paste the following code into your app to add subscribers a topic:

```kotlin
suspend fun addSubscriberToTopic(): Any? {
        val novu = Novu(apiKey = "API_KEY")
        val topicKey = "key"
        val requestBody = SubscriberList(listOf("name"))
        return CoroutineScope(Dispatchers.IO).async {
            novu.addSubscribers(topicKey, requestBody)
        }.await()
    }
```

On the other hand, if you want to remove subscribers from a topic, do the following:

```kotlin
suspend fun removeSubscriberFromTopic(): Any? {
        val novu = Novu(apiKey = "API_KEY")
        val topicKey = "key"
        val requestBody = SubscriberList(listOf("name"))
        return CoroutineScope(Dispatchers.IO).async {
            novu.removeSubscriber(topicKey, requestBody)
        }.await()
    }
```

### Sending a Notification to a Topic

Thanks to the topics feature, it is possible to trigger a notification to all subscribers assigned to a topic. This helps avoid listing all subscriber identifiers in the `to` field of the notification trigger.

:::info
This feature is not yet available on the Kotlin SDK, this doc will be updated once it is released on Kotlin.
:::

## Next Steps

Great job! :clap: If you've reached this point, you should have successfully created a subscriber, notification workflow, configured a channel provider, triggered a single notification, created a topic, added a subscriber to a topic in your application.

To learn more about notifications and explore Novu's features and capabilities, check out:

- [Novu Kotlin SDK](https://github.com/novuhq/novu-kotlin) - Dive deeper into the SDK and explore a lot of features.
- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
- [Novu Notification Center](https://docs.novu.co/notification-center/getting-started) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
