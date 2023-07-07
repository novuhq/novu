---
sidebar_position: 10
sidebar_label: Get started with NestJS
---

# NestJS Quickstart

Learn how to integrate Novu into your NestJS project on the fly and send notifications across different channels (SMS, Email, Chat, Push).

In this Quickstart, you will learn how to:
- Install the Novu Node.js SDK via npm.
- Use NestJS dependency injection with Novu Node.js SDK.
- Send your first notification.

## Requirements

To follow the steps in this quickstart, you'll need:

- A Novu account. [Sign up for free](http://web.novu.co) if you don’t have one yet.
- A working Node.js development environment with a Node.js version of 16+.

You can also [view the completed code](https://github.com/novuhq/nestjs-quickstart) of this quick start in a GitHub repo.

## Create a NestJS app to get started

The first step here would be to create a NestJS app. To get started, open your terminal and use the following commands:

```sh
npx @nestjs/cli new nestjs-quickstart

cd nestjs-quickstart
```

This command will create NestJS project and now we can create notification module and add Novu to our application.

## Installing Novu and other dependencies

Let's install Novu Node.js SDK and other dependencies like NestJS [config module](https://docs.nestjs.com/techniques/configuration).

```sh
npm install @novu/node @nestjs/config
```

Create `.env` file in the root of project and paste your API key:
```env
NOVU_API_KEY='<YOUR_NOVU_API_KEY>'
```
