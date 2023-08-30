---
sidebar_position: 12
sidebar_label: Get started with Go
---

# Go Quickstart

Welcome to Go Quickstart guide for Novu. In this guide, you'll learn how to use Novu in a Go application. Novu is a powerful notification service that enables you to send multi-channel (SMS, Email, Chat, Push) notifications. Let's see how you can seamlessly integrate Novu into your Go project!

## Prerequisites

Before diving into the Quickstart, make sure you have the following:

- The [Go SDK](https://go.dev/doc/install) installed on your development machine.
- A Novu account. If you don't have one, sign up for free at [web.novu.co](https://web.novu.co)

### Install and Set Up Novu in your Go Project

First, you must install the Novu package in your Go project. From your terminal, you can install the Novu package in your project by running the following command:

```bash
go get github.com/novuhq/go-novu
```

Once installed, you can import Novu into your project and initialize it using your Novu account credentials. This step establishes a connection between your app and the Novu notification service.

```go
import (
 novu "github.com/novuhq/go-novu/lib"
)

novuClient := novu.NewAPIClient("<NOVU_API_KEY>", &novu.Config{})
```

Replace `<NOVU_API_KEY>` with your own API key that you got from the API Key section of your [Novu Dashboard](https://web.novu.co/settings).

<aside>
🔑 Note: Please do not hardcode your credentials in a file in production. Use environment variables instead.

</aside>

## Set Up A Channel Provider

A channel provider is a service that lets you use one or more notification channels such as sending an email, SMS, push notification etc. Our [integration store](https://web.novu.co/integrations) currently supports four channels: Email, SMS, Chat, and Push. Each of these channels have multiple providers associated with them.

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

Note: Proper authorization needs to be setup for the Chat channel.

To create a notification workflow, please follow the following steps:

1. Click **Workflows** on the left sidebar of your Novu dashboard.
2. Click the **Create Workflow** button on the top right.
3. Select **blank workflow** from the dropdown.
4. The name of a new workflow is currently "Untitled." Rename it to a suitable title.
5. Select any channel you want to use in your app. For the sake of this guide, we'll be using the 'Email' channel.
   ![set-email.png] (<https://res.cloudinary.com/dxc6bnman/image/upload/v1686776583/set-email_wavtrn.png>)

6. Click on the recently added channel, fill the email subject and click “Update”.
   ![update_email_template.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776583/update_email_template_ivn0jv.png)

7. Click on the “Test” tab and send a test email to verify your notification workflow.
   ![send_test_email.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776583/send_test_email_ngzmth.png)

You should get an email within seconds. If you didn't, please check your 'spam' folder as sometimes test emails can end up there. Yaaay, you have successfully sent your first notification via the Novu dashboard!

Now, let’s take it a step further to trigger notifications via code.

## Create A Subscriber

The recipients of a triggered notification are called subscribers.

Click **Subscribers** on the left sidebar of the Novu dashboard to see all subscribers. By default, the dashboard will display only one subscriber, as you were added automatically during sign-up.

![subscriber_id.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1688331839/Screenshot_2023-07-03_at_0.02.53_jmkhi3.png)

Now, let's create a subscriber on Novu. Copy and paste the following code to do so:

```go
package main

import (
 "context"
 "fmt"
 "log"

 novu "github.com/novuhq/go-novu/lib"
)


# Create a subscriber
func main() {
    ctx := context.Background()
    subscriberID := "<REPLACE_WITH_YOUR_SUBSCRIBER>"
    subscriber := novu.SubscriberPayload{
     LastName: "Skjæveland",
     Email:    "benedicte.skjaeveland@example.com",
     Avatar:   "https://randomuser.me/api/portraits/thumb/women/79.jpg",
     Data: map[string]interface{}{
      "location": map[string]interface{}{
       "city":     "Ballangen",
       "state":    "Aust-Agder",
       "country":  "Norway",
       "postcode": "7481",
      },
     },
    }

 resp, err := novuClient.SubscriberApi.Identify(ctx, subscriberID, subscriber)
 if err != nil {
  log.Fatal("Subscriber error: ", err.Error())
  return
 }

 fmt.Println(resp)
}
```

Run the code in your terminal like so:

```bash
go run main.go # replace main.go with your file name
```

You should see a new subscriber (that you created above) on your Novu dashboard.

## Update A Subscriber

To update the Subscriber details you can call the put method from SubcriberApi. Here is an example:

```go
package main

import (
 "context"
 "fmt"
 "log"

 novu "github.com/novuhq/go-novu/lib"
)

# Update subscriber details
func main() {
    ctx := context.Background()
    subscriberID := "<REPLACE_WITH_YOUR_SUBSCRIBER>"
    updateSubscriber := novu.SubscriberPayload{FirstName: "Susan"}
 updateResp, err := novuClient.SubscriberApi.Update(ctx, subscriberID, updateSubscriber)
 if err != nil {
  log.Fatal("Update subscriber error: ", err.Error())
  return
 }

 fmt.Println(updateResp)
}
```

<aside>
Note: To send notifications to all your users, you'll need to make them subscribers in Novu, which you can do by programmatically adding them to Novu.

</aside>

## Trigger A Notification

Copy and paste the following code into your app to trigger a notification:

```go
package main

import (
 "context"
 "fmt"
 "log"

 novu "github.com/novuhq/go-novu/lib"
)

# Trigger A Notification
func main() {
    subscriberID := "<<REPLACE_WITH_YOUR_SUBSCRIBER>"
 apiKey := "<REPLACE_WITH_YOUR_API_KEY>"
 eventId := "<REPLACE_WITH_YOUR_EVENT_ID>"

 ctx := context.Background()
 to := map[string]interface{}{
  "lastName":     "Nwosu",
  "firstName":    "John",
  "subscriberId": subscriberID,
  "email":        "johnnwosu@email.com",
 }
 payload := map[string]interface{}{
  "name": "Hello World",
  "organization": map[string]interface{}{
   "logo": "https://happycorp.com/logo.png",
  },
 }
 
 novuClient := novu.NewAPIClient(apiKey, &novu.Config{})
 triggerResp, err := novuClient.EventApi.Trigger(ctx, eventId, novu.ITriggerPayloadOptions{
  To:      to,
  Payload: payload,
 })
 if err != nil {
  log.Fatal("Novu error", err.Error())
  return
 }

 fmt.Println(triggerResp)
}
```

Before running the code, make sure you understand the following:

- The value of `eventId` should be the notification workflow's trigger ID/slug.

![trigger_id.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1686776585/trigger_id_xkhsx7.png)

- The value of `payload` is an array of the data that you want to be dynamically injected into the notification template content.
- The value of `subscriberId` is the id of the subscriber on Novu.

Replace all items with their respective and accurate values.

Run the code to trigger a notification!

```bash
go run main.go # replace main.go with your file name
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

```go
package main

import (
 "context"
 "fmt"
 "log"

 novu "github.com/novuhq/go-novu/lib"
)

# Create Topic
func main() {
    ctx := context.Background()
    topicKey := "<REPLACE_WITH_YOUR_TOPIC_KEY>"
    topicName := "<REPLACE_WITH_YOUR_TOPIC_NAME>"
 createResp, err := novuClient.TopicsApi.Create(ctx, topicKey, topicName)
 if err != nil {
  log.Fatal("Create topic error: ", err.Error())
  return
 }

 fmt.Println(createResp)
}
```

Before running the code, make sure you understand the following:

- When creating a `key`, ensure it is unique and accurately identifies the topic. Document naming conventions and communicate them to team members to avoid confusion and ensure a smooth workflow.
- The value of `name` should be a descriptive topic name.

### Add subscribers to a Topic

Copy and paste the following code into your app to add subscribers a topic:

```go
package main

import (
 "context"
 "fmt"
 "log"

 novu "github.com/novuhq/go-novu/lib"
)

# Add subscriber to Topic
func main() {
    ctx := context.Background()
    topicKey := "<REPLACE_WITH_YOUR_TOPIC_KEY>"
    subscribers := []string{"<SUBSCRIBER_ID_1>", "<SUBSCRIBER_ID_2>"}
 addSubscribersResp, err := novuClient.TopicsApi.AddSubscribers(ctx, topicKey, subscribers)
 if err != nil {
  log.Fatal("Add subscriber to topic error: ", err.Error())
  return
 }

 fmt.Println(addSubscribersResp)
}
```

On the other hand, if you want to remove subscribers from a topic, do the following:

```go
package main

import (
 "context"
 "fmt"
 "log"

 novu "github.com/novuhq/go-novu/lib"
)

# Remove subscriber from Topic
func main() {
    ctx := context.Background()
    topicKey := "<REPLACE_WITH_YOUR_TOPIC_KEY>"
    subscribers := []string{"<SUBSCRIBER_ID_1>", "<SUBSCRIBER_ID_2>"}
 removeSubscribersResp, err := novuClient.TopicsApi.RemoveSubscribers(ctx, topicKey, subscribers)
 if err != nil {
  log.Fatal("Add subscriber to topic error: ", err.Error())
  return
 }

 fmt.Println(addSubscribersResp)
}
```

### Sending a notification to a Topic

Thanks to the topics feature, it is possible to trigger a notification to all subscribers assigned to a topic. This helps avoid listing all subscriber identifiers in the `to` field of the notification trigger.

To trigger a notification to all subscribers of a topic, copy and paste the code below:

```go
package main

import (
 "context"
 "fmt"
 "log"

 novu "github.com/novuhq/go-novu/lib"
)

# Trigger A Notification
func main() {
    topicKey := "<<REPLACE_WITH_YOUR_TOPIC_KEY>"
 apiKey := "<REPLACE_WITH_YOUR_API_KEY>"
 eventId := "<REPLACE_WITH_YOUR_EVENT_ID>"
 ctx := context.Background()
 
 to := map[string]interface{}{
  "type":     "Topic",
  "topicKey":    topicKey
 }
 payload := map[string]interface{}{
  "name": "Hello World",
  "organization": map[string]interface{}{
   "logo": "https://happycorp.com/logo.png",
  },
 }
 
 novuClient := novu.NewAPIClient(apiKey, &novu.Config{})
    triggerResp, err := novuClient.EventApi.Trigger(ctx, eventId, novu.ITriggerPayloadOptions{
      To:      to,
      Payload: payload,
     })
 if err != nil {
  log.Fatal("Novu error", err.Error())
  return
 }

 fmt.Println(triggerResp)
}
```

## Next Steps

Great job! If you've reached this point, you should now have successfully created a subscriber, notification workflow, configured a channel provider and triggered a notification in your application.

To learn more about notifications and explore Novu's features and capabilities, check out:

- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
- [Novu Go SDK](https://github.com/novuhq/go-novu) - Delve deeper into the SDK and explore a lot of features.
- [Novu Notification Center](https://docs.novu.co/notification-center/getting-started) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
