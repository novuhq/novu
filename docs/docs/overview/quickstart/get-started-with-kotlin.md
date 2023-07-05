---
sidebar_position: 9
sidebar_label: Get started with Kotlin
---

# Kotlin Quickstart

Learn how to integrate Novu into your Kotlin project on the fly and send notifications across different channels (SMS, Email, Chat, Push).

In this Quickstart, you will learn how to:

- [Install and Set up the Novu Kotlin SDK.](#install-and-set-up-the-novu-kotlin-sdk-in-your-project)
- [Configure a Notification Channel Provider.](#set-up-a-channel-provider)
- [Set up a Notification Workflow.](#create-a-notification-workflow)
- Create Subscribers and update a Subscriber's information.
- Send your first Notification to a subscriber.
- Send Notifications via Topics.

Let's get started! :muscle:

## Requirements

To be able to use this Quickstart, you would need to have the following:

- A Novu account, if you don't have one yet, [sign up](https://web.novu.co) for free.
- A working Kotlin project running version 1.6.0+ and Kotlin compiler 1.8.0+.

The completed code for this quick start will be available on GitHub soon. Check it out [here](https://github.com/novuhq).

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
Sync your project, and you should have the artifacts downloaded. Once that is done successfully, head over to the [web portal](https://web.novu.co) for the next steps.

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

Note: Proper authorization needs to be set for the Chat channel for subscribers.

Please proceed to create a notification workflow.

1. Click 'Workflows' on the left sidebar of your Novu dashboard.
2. Click the 'Create Workflow' button on the top right.
   ![Creating a workflow in Novu dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127676/guides/SCR-20230630-pqdm_z5npqe.png)
3. The name of a new notification workflow is currently 'Untitled', rename it to a more suitable title.
   ![Renaming the newly created notification workflow](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127735/guides/SCR-20230630-pqpp_lvjfea.png)
4. Select 'Email' as the channel you want to add, by dragging it from the right sidebar.
   ![Adding email channel to the notification workflow we created above](https://res.cloudinary.com/dxc6bnman/image/upload/v1688128047/guides/SCR-20230630-psgt_ottznp.png)
5. Click on the 'Email' in the workflow and edit it as per this image. Don’t forget to add the fields in the editor which is supposed to be updated with dynamic values that will be sent when calling the API.
   ![Adding email and description to the editor in the notification workflow we created above](https://res.cloudinary.com/dxc6bnman/image/upload/v1688128150/guides/SCR-20230630-psxv_ef7jwh.png)
6. Also, add the variables in the 'Variables' section in the test tab and try testing it by sending the email to your email address using the 'Send Test Email' button at the bottom right.
   ![Adding variables to the 'variables' section](https://res.cloudinary.com/dxc6bnman/image/upload/v1688129220/guides/SCR-20230630-pzgl_n94giv.png)

You should get an email within seconds! :ok_hand:

Great, you have successfully sent your first notification via the Novu dashboard! Now, let’s take a step further to trigger notifications via code.
