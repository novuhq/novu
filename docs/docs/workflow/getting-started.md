---
sidebar_position: 1
---

# Getting Started

Novu allows you to send notifications to your users through a variety of channels.
You can control the flow of a particular notification using our visual workflow editor.
In this guide we will walk you through the different phases of a workflow execution and the different step types you can use.

## Basics

### Workflow metadata

This will contain general information regarding the notification itself. Let's explore the different aspects of it.

#### Notification name

The name will be used to identify the notification template when triggering it. A slugified version of the name will be generated after the notification was created. For example, a notification template with the name of "Test Notification" will be converted to "test-notification" as the trigger key.

#### Notification Group

The notification group is used to group multiple notification templates into a single group, currently only used behind the scenes for organizational purposes. But, in the upcoming subscriber preferences management, it will be used to group multiple notifications for the subscriber.

### Steps

The template steps are used to organize the different messages in a particular flow. You can add messages for multiple channels and in the upcoming workflow editor release you will be able to configure custom flows that include actions like Delay, Digest and other conditional steps.

### User Preference Settings

Here you can control the defaults for the user preferences. You can set the default preference for each channel and also set a particular notification as `critical` which will force the user to opt-in to receive the notification without a way to opt-out.
