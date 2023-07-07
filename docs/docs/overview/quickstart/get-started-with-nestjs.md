---
sidebar_position: 10
sidebar_label: Get started with NestJS
---

# NestJS Quickstart

Learn how to integrate Novu into your NestJS project on the fly and send notifications across different channels (SMS, Email, Chat, Push).

In this Quickstart, you will learn how to:
- Install the Novu Node.js SDK via npm.
- Use Novu Node.js SDK with NestJS dependency injection.
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

## Install Novu and other dependencies

Let's install Novu Node.js SDK and other dependencies like NestJS [config module](https://docs.nestjs.com/techniques/configuration):

```sh
npm install @novu/node @nestjs/config
```

Create `.env` file in the root of project and paste your API key:
```env
NOVU_API_KEY='<YOUR_NOVU_API_KEY>'
```

## Create notification module and integrate Novu
Generate `notification` module with NestJS CLI:
```
npx @nestjs/cli g module notification
```

Register module in `app.module.ts` file:
```ts
// app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [ConfigModule.forRoot(), NotificationModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

Create `novu.provider.ts` file inside notification module to integrate Novu SDK with NestJS dependency injection:
```ts
// novu.provider.ts

import { Provider, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Novu } from '@novu/node';

export const NOVU_PROVIDER_TOKEN = 'NOVU_PROVIDER_TOKEN';

export const NovuProvider: Provider = {
  provide: NOVU_PROVIDER_TOKEN,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const NOVU_API_KEY = config.get<string>('NOVU_API_KEY');

    return new Novu(NOVU_API_KEY);
  },
};

export const InjectNovu = () => Inject(NOVU_PROVIDER_TOKEN);
```

Next create `notification.service.ts` file and inject Novu provider in class constructor:

```ts
// notification.service.ts

import { Injectable } from '@nestjs/common';
import { Novu } from '@novu/node';
import { InjectNovu } from './novu.provider';

@Injectable()
export class NotificationService {
  constructor(
    @InjectNovu()
    private readonly novu: Novu,
  ) {}

  async sendEmail(email: string, description: string) {
    await this.novu.subscribers.identify('123', {
      email: email,
      firstName: 'Subscriber',
    });

    const result = await this.novu.trigger('email-quickstart', {
      to: {
        subscriberId: '123',
        email: email,
      },
      payload: {
        email: email,
        description: description,
      },
    });

    return result.data;
  }
}
```

We also have to create `notification.controller.ts` file inside notification module and create endpoint for sending emails:

```ts
// notification.controller.ts

import { Body, Controller, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('emails')
  sendEmail(@Body() body: { email: string; description: string }) {
    return this.notificationService.sendEmail(body.email, body.description);
  }
}
```

Don't forget to register all providers and controller in `notification.module.ts` file: 
```ts
// notification.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NovuProvider } from './novu.provider';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

@Module({
  imports: [ConfigModule],
  providers: [NovuProvider, NotificationService],
  controllers: [NotificationController],
})
export class NotificationModule {}
```

We can now start our local server and test our backend app on Postman. To start the local server, use the following command:
```sh
npm run start:dev
```
