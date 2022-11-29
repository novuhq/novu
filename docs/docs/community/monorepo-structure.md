---
sidebar_position: 2
---

# Monorepo structure

In this guide, we will explore the Novu mono-repo structure and high-level structure of the different libraries and services we use.

![Monorepo outline of packages and services](/img/monorepo-structure.jpeg)

## Setting up the monorepo

Novu uses [PNPM](https://pnpm.js.org/) as its package manager, and [NX](https://nx.dev/) as its build CLI tool. PNPM reduces the installation time and generates symlinks for all the internal packages we use.

To initialize the monorepo, run the following command from the root of the project:

```bash
npm run setup:project
```

This will:

- run `pnpm install`, which will download all the needed dependencies and create symlinks for packages.
- copy the `.env.example` file to the `.env` file for the API service.
- execute the `npm run build` command to build all the dependency trees locally.

For additional information on running Novu locally, visit the [run locally](https://docs.novu.co/community/run-locally) guide.

## Apps

The apps folder contains high-level applications and APIs. The app's outputs usually contain deployable units that a user can interact with either as an API or as a web/cli application.

### API

The API package is our main service for handling backend logic. It handles anything from authentication, authorization, notification template management, triggering events, etc... This is where the Novu business logic is handled.

### WS aka Web-Socket

This is the WebSocket NestJs server which connects to the widget and provides real-time updates about new notifications to the widget consumer.

### WEB aka Admin Panel

This is the Novu admin panel which is used to visually communicate with the API. You can configure templates, manage content, enable or disable notifications, visually track the notification activity feed, etc...

The `WEB` project is a create-react-app built, well, with React. 😄

### Widget

This is the client of our embeddable notification center widget. It is consumed mainly with the embed script in an Iframe. We can access it on port 4500 to interact with it directly.

## Libs

### @novu/dal

The `DAL` is our Data-Access-Layer. This is our connection to the DB service and wraps MongoDB and mongoose. When another service or API needs to consume the DB, it does not do that directly but uses the DAL as an interface. Importing `mongoose` directly outside the `dal` is not allowed.

### @novu/testing

This is a utility library that contains testing helpers. The testing helpers can generate test sessions and other functionality for e2e and unit-tests between our services.

### @novu/shared

The shared library contains reusable code and typescript interfaces between client and server packages. Code in the shared library should not contain any sensitive content because it can be accessed and downloaded by the web or other clients.

### @novu/embed

This is the connector between our client's web app and the widget project. It’s a small shim script that generates an iframe and attaches it to a client-specified div to host the notification widget.

If you are familiar with the Google Analytics embedded snippet or intercom-like embeddings, it uses the same mechanics.

## Packages (on npm)

### @novu/node

A Standalone Node.js wrapper around the Novu API. Exists to provide type-safe and easier access to the different API endpoints Novu exposes (Triggers, subscribers, etc…).

### @novu/nest

A Nest.js wrapper around the `@novu/node` package was created by the community to easily interact with the core library from a nest project. Also released on NPM as a package.

### @novu/notification-center

React component library that contains widget bell with the notification center. Can get override of components like ‘bell icon’, and ‘notification center’.

## Providers

These are the API wrappers created by the community to wrap communication providers in the following channels:

Novu provides a single API to manage providers across multiple channels with a simple-to-use interface.

### 💌 Email

- [Sendgrid](https://github.com/novuhq/novu/tree/main/providers/sendgrid)
- [Netcore](https://github.com/novuhq/novu/tree/main/providers/netcore)
- [Mailgun](https://github.com/novuhq/novu/tree/main/providers/mailgun)
- [SES](https://github.com/novuhq/novu/tree/main/providers/ses)
- [Postmark](https://github.com/novuhq/novu/tree/main/providers/postmark)
- [NodeMailer](https://github.com/novuhq/novu/tree/main/providers/nodemailer)
- [Mailjet](https://github.com/novuhq/novu/tree/main/providers/mailjet)
- [Mandrill](https://github.com/novuhq/novu/tree/main/providers/mandrill)
- [SendinBlue](https://github.com/novuhq/novu/tree/main/providers/sendinblue)
- [EmailJS](https://github.com/novuhq/novu/tree/main/providers/emailjs)

### 📞 SMS

- [Twilio](https://github.com/novuhq/novu/tree/main/providers/twilio)
- [Plivo](https://github.com/novuhq/novu/tree/main/providers/plivo)
- [SNS](https://github.com/novuhq/novu/tree/main/providers/sns)
- [Nexmo - Vonage](https://github.com/novuhq/novu/tree/main/providers/nexmo)
- [Sms77](https://github.com/novuhq/novu/tree/main/providers/sms77)
- [Telnyx](https://github.com/novuhq/novu/tree/main/providers/telnyx)
- [Termii](https://github.com/novuhq/novu/tree/main/providers/termii)
- [Gupshup](https://github.com/novuhq/novu/tree/main/providers/gupshup)

### 📱 Push

- [FCM](https://github.com/novuhq/novu/tree/main/providers/fcm)
- [Expo](https://github.com/novuhq/novu/tree/main/providers/expo)
- [SNS](https://github.com/novuhq/novu/tree/main/providers/sns)

### 👇 Chat

- [Slack](https://github.com/novuhq/novu/tree/main/providers/slack)
- [Discord](https://github.com/novuhq/novu/tree/main/providers/discord)

### 📱 In-App

- [Novu](https://docs.novu.co/notification-center/getting-started)

### Other (Coming Soon...)

- PagerDuty
