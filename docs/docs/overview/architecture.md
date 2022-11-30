# Architecture

OCL was built around the idea of separation of concerns (SoC). The idea is that transactional communication is composed of many different parts, each of which is responsible for a specific task. Modeling the communication layer is the key for easy maintenance and integration of new functionality.

Let's deep dive into the building blocks of Novu's OCL approach.

## The mental model

![Novu Architecture](https://user-images.githubusercontent.com/89788120/195802678-6d566d86-8175-490f-9ac9-dfd23b8959bd.png)

## Templates

Templates are the blueprints for all the notifications in Novu. They provide base configurations for each message. The message is tied to a specific channel for which a content template, code rules and filters, priorities, and other metadata that will affect the delivery of a specific message is provided.

## Environments

This is the context in which all of your subscribers and templates exist. This will usually map to your own environments, so any new changes you are making will be firstly included in the Development environment and once they are tested, you can use our merging changes tool to promote them to production environment.

The production environment is a read-only environment. It means that you can only promote changes to it from the Development environment rather than modifying it directly.

## Providers

Providers are the delivery endpoints for your notifications. They are responsible for delivering the notifications to the end users on the specified channel. Providers usually refer to a specific channel, such as email, SMS, Chat, etc... Each provider is stateless and adheres to a specific interface and Novu manages state and mediates all provider-specific configurations.

### Provider Types

- **Email** (Sendgrid, mailgun, mandrill, etc...)
- **SMS** (Twilio, Nexmo, etc...)
- **Chat** (Slack, MS messages, etc...)
- **Push** (Pushover, One Signal, etc...)
- **Web push**

The responsibility of each provider is to send the notification to the end-recipient without the awareness of the content, contact, or context of the message.

## Subscribers

Subscribers are the recipients of notifications. A subscriber will contain the delivery details such as: Email address, phone number, push tokens and etc...

Populating a subscriber with data can be done using our server side SDK. Read more about it [here](/platform/subscribers).

## Trigger

The trigger is responsible to let the engine know what happened and what notification template will be triggered in response to the event. Each trigger will pass the variables and data required to render the notification messages. If a value is missing, the variable protection mode will be enabled and the message won't be sent.

The trigger should only be responsible to let the system know that something has happened, but not where and when the message will be delivered.

## Communication API

This is the unit that is responsible for reading the configurations of the templates, finding the relevant channels, locating the providers, and doing the heavy lifting of sending the notifications. All logical rules such as priority, timing, channel selection, and others are managed by the engine.

## Template and Integration Stores

It is responsible for storing the configurations of all the providers and templates during the runtime of the API.
