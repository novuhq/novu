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

After installing dependencies, we need to connect our app with our Novu account using the Novu API key. Simply log onto the [Novu web dashboard](https://web.novu.co) and from the settings there, obtain your API key. We’ll use it to connect our app to our Novu account.

![Novu API key is available on the Novu web dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127601/guides/SCR-20230630-ppsb_ky06jv.png)

Create `.env` file in the root of project and paste your obtained API key:
```env
NOVU_API_KEY='<YOUR_NOVU_API_KEY>'
```

## Create notification module and integrate Novu
Generate `notification` module with NestJS CLI:
```
npx @nestjs/cli g module notification
```

Register modules in `app.module.ts` file:
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

## Create the route for sending notifications 

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

Lastly, don't forget to register all providers and controller in `notification.module.ts` file: 
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

Next, let's open Postman or other similar tool to test our endpoint. Send a POST request to the route we defined in notification controller - `http://localhost:3000/notifications/emails`.

![postman-vsc](https://github.com/michaldziuba03/novu/assets/43048524/844fbbef-1f0a-4f7e-964e-184fe74abff9)

> In place of email field, use your actual email.

This means that the email notification was sent successfully. Now go to your inbox and you should see an email notification like the following:

![email-screenshot](https://github.com/michaldziuba03/novu/assets/43048524/d5c97ae2-07c1-4e6c-b9a4-0c82ac4e6681)


## Next Steps

Great job! If you've reached this point, you should now have successfully created a subscriber, notification template, configured a channel provider and triggered a notification in your application.

To learn more about notifications and explore Novu's features and capabilities, check out:

- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
- [Novu Notification Center](https://docs.novu.co/notification-center/getting-started) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
