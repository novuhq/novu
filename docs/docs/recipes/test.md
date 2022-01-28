---
id: monorepo
title: Monorepo Structure
notion_page_id: b34ab7edac334e6f9a5fe457cae3c530
---

In this guide, we will explore Relayed mono-repo structure and high-level structure of the different libraries and services we have.

![https://miro.com/app/board/uXjVOUZtmvY=/](https://s3.us-west-2.amazonaws.com/secure.notion-static.com/e880ab15-eae1-4069-905a-0c4bca310d58/Mono-repo_Structure.jpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220128%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220128T125253Z&X-Amz-Expires=3600&X-Amz-Signature=7a2d6f15a2d7f1ebf0a4d2d45eac8094999028aa5cfb3bf11f82b786d81bd88f&X-Amz-SignedHeaders=host&x-id=GetObject)

# Apps

The apps folder contains high-level applications and API’s. The apps outputs usually contain deployable units that a user can interact with either as an API or as a web/cli application.

## API

The API package is our main service for handling backend logic. It handles anything from authentication, authorization, notification template management, triggering events, etc... This is where the Relayed business logic is handled. 

## WS aka Web-Socket

This is the WebSocket NestJs server, it connects to the widget and provides real-time updates about new notifications to the widget consumer.

## WEB aka Admin Panel

This is the Relayed admin panel, it’s used to visually communicate with the API. You can configure templates, manage content, enable or disable notifications, visually track the notification activity feed, etc... 

The `WEB` project is a create-react-app built, well, with React 😄

## Widget

This is the client of our embeddable notification center widget. It is consumed mainly with the embed script, in an Iframe. We can access it on port 4500 to interact with it directly. 

# Libs

## DAL

The `DAL` is our Data-Access-Layer, this is our connection to the DB service and wraps MongoDB and mongoose. When another service or API needs to consume the DB, it does not do that directly but uses the DAL as an interface. Importing `mongoose` directly outside the `dal` is not allowed.

## Testing

This is a utility library that contains testing helpers, the testing helpers can generate a test session or other functionality for e2e and unit-tests we use between our services.

## Shared

The shared library contains reusable code and typescript interfaces between client and server packages. Code in the shared library should not contain any sensitive content because it can be accessed and downloaded by a web or other clients. 

## SDK

This is the connector between our client's web app and the widget project. It’s a small shim script that generates an iframe and attaches it to a client-specified div to host the notification widget. 

If you are familiar with the google analytics embed snippet or intercom-like embeds it uses the same mechanics. 

# Packages (on npm)

## Core

A standalone Node.js library is used to [consolidate](/0f7f71d4f16b478ea8091a621be1c569) all communication providers under a single API. This library is released on NPM and can be used as a standalone tool and as a client for the Relayed API. The API consumes this library as well when it needs to communicate a message via the specified provider. 

## Nest

A Nest.js  wrapper around the `@notifire/core` package created by the community to easily interact with the core library from a nest project. Also released on NPM as a package.

# Providers

These are the API wrappers created by the community to wrap communication providers in the following channels:

- Email

- SMS

- Push

- Web-Push

- Direct (Slack, MS Teams, Whatsapp, etc...)

Providers can be consumed directly or using the `core` library for a unified API.
