---
sidebar_position: 11
sidebar_label: Get started with .NET
---

# .NET Quickstart

Learn how to use Novu to quickly send multi-channel (SMS, Email, Chat, Push) notifications from a .NET app.

In this Quickstart, you’ll learn how to:

- [Install and use the Novu .NET SDK via the dotnet CLI.](#install-novu-net-sdk)
- [Configure a Notification Channel Provider.](#set-up-a-channel-provider)
- [Set up a notification workflow.](#create-a-notification-workflow)
- [Create subscribers and update subscriber information.](#create-a-subscriber)
- [Send your first notification.](#trigger-a-notification)
- [Send notifications via topics.](#sending-a-notification-to-a-topic)

## Requirements

To follow the steps in this quickstart, you'll need:

- A Novu account. [Sign up for free](http://web.novu.co) if you don’t have one yet.
- A working .NET development environment with a .NET version of .NET Core 2.0+ and .NET Framework of 4.6.1+.

You can also [view the completed code](https://github.com/novuhq/novu-dotnet-quickstart) of this quick start in a GitHub repo.

## Install Novu .NET SDK

The [.NET SDK](https://github.com/novuhq/novu-dotnet) provides a fluent and expressive interface for interacting with Novu's API and managing notifications.

Now install the Novu .NET SDK by running the following command in your terminal:

```bash
dotnet add package Novu
```

Otherwise, modify your .csproj file add the following to it:

```xml
<ItemGroup>
    <PackageReference Include="Novu" Version="*" />
</ItemGroup>
```

Next, install the SDK by running the following `dotnet` command:

```bash
dotnet restore
```

## Initialize & Configure the Novu SDK

Create a new file, `Program.cs` in your application and add the following code to it:

Program.cs:

```csharp
using Novu.DTO;
using Novu.DTO.Topics;
using Novu.Models;
using Novu;


 var novuConfiguration = new NovuClientConfiguration
{
    ApiKey = "<YOUR_NOVU_API_KEY>",
};

var novu = new NovuClient(novuConfiguration);
```

Replace the `ApiKey`’s value with the authentic key from the **API Key** section of your [Novu Dashboard](https://web.novu.co/settings) and be sure to use your specific Novu instance URL.

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
|         | 2. Click and place UI items with the visual workflow editor.                                  |
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

Program.cs:

```csharp
// Create subscriber

var newSubscriberDto = new CreateSubscriberDto
{
  SubscriberId = "77809", //replace with system_internal_user_id
  FirstName = "John",
  LastName = "Doe",
  Email = "benlin1994@gmail.com",
  Data = new List<AdditionalDataDto>{
    new AdditionalDataDto
    {
        Key = "External ID",
        Value = "1122334455"
    },
    new AdditionalDataDto
    {
        Key = "Job Title",
        Value = "Software Engineer"
    }
  }
};

var subscriber = await novu.Subscriber.CreateSubscriber(newSubscriberDto);

```

Run the code in your terminal like so:

```bash
dotnet run Program.cs
```

You should see the subscriber on your Novu dashboard.

![Recently created subscriber](https://res.cloudinary.com/dxc6bnman/image/upload/f_auto,q_auto/v1685466979/guides/Screenshot_2023-05-14_at_11.06.38_ugvmc0.png)

I’d like to publicly announce that `abc@gmail.com` is a random unlikely email your users will have. To update this to an alternative email, you can call the `UpdateSubscriber` method like so:

Program.cs:

```csharp
// Update subscriber detail
var subscriber7789 = await novu.Subscriber.GetSubscriber("7789");

subscriber7789.Email = "validemail@gmail.com"; // replace with valid email
subscriber7789.FirstName = "<insert-firstname>"; // optional
subscriber7789.LastName = "<insert-lastname>"; // optional

var updatedSubscriber = await novu.Subscriber.UpdateSubscriber("7789",subscriber7789);
```

Other valid fields that can be updated are `phone`, `avatar`, and `data` . The `data` field can accept an array of metadata that you want to attach to the subscriber.

::::info
To make all of your app users subscribers, you need to programmatically add them to Novu.
::::

## Trigger A Notification

Copy and paste the following code into your app to trigger a notification:

OnboardEventPayload.cs:

```csharp
// OnboardEventPayload.cs
public class OnboardEventPayload
{
  [JsonProperty("username")]
  public string Username { get; set; }

  [JsonProperty("welcomeMessage")]
  public string WelcomeMessage { get; set; }
}

```

Program.cs:

```csharp
var onboardingMessage = new OnboardEventPayload
{
  Username = "jdoe",
  WelcomeMessage = "Welcome to novu-dotnet"
};

var payload = new EventTriggerDataDto()
{
  EventName = "onboarding", //make sure you have a trigger named "onboarding"
  To = { SubscriberId = "7789" },
  Payload = onboardingMessage
};

var trigger = await novu.Event.Trigger(payload);

if (trigger.TriggerResponsePayloadDto.Acknowledged)
{
  Console.WriteLine("Trigger has been created.");
}

```

Before running the code, make sure you understand the following:

- The value of `EventName` should be the notification workflow’s trigger ID/slug.

![Notification Workflow](https://res.cloudinary.com/dxc6bnman/image/upload/f_auto,q_auto/v1685466980/guides/trigger_id_1_ur1azh.png)

- The value of `Payload` is an array of the data that you want to be dynamically injected into the notification workflow content.
- The value of `SubscriberId` is the id of the subscriber on Novu. Replace `7789` with your subscriber ID.

Run the code to trigger a notification!

```bash
dotnet run Program.cs
```

Next, we’ll learn how to send notifications to different groups of subscribers easily via **Topics.**

## Topics

Novu provides a simple API that offers an easy interface for triggering notifications to multiple subscribers at once. This API is called **Topics** and allows users to manage their bulk notifications without having to implement complex loops.

A topic is identified by a custom key and this key will be the identifier used when triggering notifications. You can assign a name to a topic for descriptive purposes. This name does not need to be unique and can be changed programmatically.

::::info
The topic key should be unique and can't be changed once chosen. Novu also safe guards for key uniqueness behind the scenes.
::::

A topic can have multiple subscribers who will receive a notification whenever a message is sent to the topic.

## Create a Topic

Copy and paste the following code into your app to create a topic:

```csharp
// Create Topic
var topicRequest = new TopicCreateDto
{
    Key = "frontend-users",
    Name = "All frontend users",

};

var topic = await novu.Topic.CreateTopicAsync(topicRequest);

```

Before running the code, make sure you understand the following:

- When creating a `Key`, ensure it is unique and accurately identifies the topic. Document naming conventions and communicate them to team members to avoid confusion and ensure a smooth workflow.
- The value of `Name` should be a descriptive topic name.

## Add Subscribers to a Topic

Copy and paste the following code into your app to add subscribers to a topic:

```csharp

// Add Subscriber to Topic
var topicKey = "frontend-users";
var subscriberList = new TopicSubscriberUpdateDto
{
    Keys = new List<string>
    {
        "7789",
        "7790",
    }
};

var result = await novu.Topic.AddSubscriberAsync(topicKey, subscriberList);

```

## Sending a Notification to a Topic

Thanks to the topics feature, it is possible to trigger a notification to all subscribers assigned to a topic. This helps avoid listing all subscriber identifiers in the `to` field of the notification trigger.

To trigger a notification to all subscribers of a topic, copy and paste the code below:

Program.cs

```csharp
// Send notifications to a topic (all frontend users)

var onboardingMessage = new OnboardEventPayload
{
  WelcomeMessage = "Welcome to novu-dotnet"
};

var payloadTopic = new EventTopicTriggerDto
{
  EventName = "onboarding",
  Payload = onboardingMessage,
  Topic = { Type = "7789", TopicKey = "frontend-users" },

};

var triggerTopic = await novu.Event.TriggerTopicAsync(payloadTopic);

if (triggerTopic.TriggerResponsePayloadDto.Acknowledged);
{
  Console.WriteLine("Trigger has been created.");
}

```

## Next Steps

Great job! If you've reached this point, you should now have successfully created a subscriber, notification workflow, configured a channel provider and triggered a notification in your application.

To learn more about notifications and explore Novu's features and capabilities, check out:

- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
- [Novu .NET SDK](https://github.com/novuhq/novu-dotnet) - Delve deeper into the SDK and explore a lot of features.
- [Novu Notification Center](https://docs.novu.co/notification-center/getting-started) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
