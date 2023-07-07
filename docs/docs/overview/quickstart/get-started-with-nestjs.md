---
sidebar_position: 10
sidebar_label: Get started with NestJS
---

# NestJS Quickstart

Learn how to use Novu to quickly send multi-channel (SMS, Email, Chat, Push) notifications from a NestJS app.

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

```bash
npx @nestjs/cli new nestjs-quickstart
cd nestjs-quickstart
```

This command will create NestJS project and now we can create notification module and add Novu to our application.

## Install Novu SDK and other dependencies

Let's install Novu Node.js SDK and other dependencies like [config module](https://docs.nestjs.com/techniques/configuration) for NestJS:

```bash
npm install @novu/node @nestjs/config
```

After installing dependencies, we need to connect our app with our Novu account using the Novu API key. Simply log onto the [Novu web dashboard](https://web.novu.co) and from the settings there, obtain your API key. We’ll use it to connect our app to our Novu account.

![Novu API key is available on the Novu web dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127601/guides/SCR-20230630-ppsb_ky06jv.png)

Create `.env` file in the root of project and paste your obtained API key:

```bash
NOVU_API_KEY='<YOUR_NOVU_API_KEY>'
```

:::info
Don't forget to add .env file to .gitignore
:::

Novu lets us send notifications across different channels like email, in-app, chat, SMS, etc, and for each channel, one can use a plethora of providers. You just need to set up a provider for the channel you want to use in Novu:

| Channel | Providers                                                           |
| ------- | ------------------------------------------------------------------- | --- |
| Email   | MailGun, Mandrill, MailJet, Amazon SES, Sendgrid, Postmark, Netcore |     |
| SMS     | Twilio, Amazon SNS, Plivo, SMS, SMSCentral, Kannel, Infobip, Termii |
| Chat    | Mattermost, Slack, Microsoft Teams, Discord                         |
| Push    | FCM, APNS, Expo                                                     |

You can see all this in our [integrations store](https://web.novu.co/integrations) and set it up there.

For each channel, there can be only one provider active at a time. Although the exact setup process varies from provider to provider, the general flow is signing up for a provider, getting an API key from its portal, and plugging it into the Novu web portal.

Once having integrated a provider, we need a notification workflow to send notifications. One can have dynamic data in this workflow if they so choose.

In our case, we’ll have dynamic data and whatever we send as a description will be sent as an email notification. Following are the steps to create a notification workflow.

## Creating a Notification Workflow

1. Click "Workflows” on the left sidebar of your Novu dashboard.
2. Click the “Create Workflow” button on the top right.
   ![Creating a workflow in Novu dashboard](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127676/guides/SCR-20230630-pqdm_z5npqe.png)
3. The name of a new notification workflow is currently "Untitled." Rename it to a more suitable title.
   ![Renaming the newly created notification workflow](https://res.cloudinary.com/dxc6bnman/image/upload/v1688127735/guides/SCR-20230630-pqpp_lvjfea.png)
4. Select "Email" as the channel you want to add, by dragging it from the right sidebar:
   ![Adding email channel to the notification workflow we created above](https://res.cloudinary.com/dxc6bnman/image/upload/v1688128047/guides/SCR-20230630-psgt_ottznp.png)
5. Click on the ‘Email’ in the workflow and edit it as per this image. Don’t forget to add the fields in the editor which is supposed to be updated with dynamic values that we’ll send when calling the API.
   ![Adding email and description to the editor in the notification workflow we created above](https://res.cloudinary.com/dxc6bnman/image/upload/v1688128150/guides/SCR-20230630-psxv_ef7jwh.png)
6. Also, add the variables in the ‘variables’ section in the test tab and try testing it by sending the email to your email id using the ‘send test email’ button on the bottom right.
   ![Adding variables to the 'variables' section](https://res.cloudinary.com/dxc6bnman/image/upload/v1688129220/guides/SCR-20230630-pzgl_n94giv.png)

Now, we’ve successfully sent the test email and just need to do this from our app.

## Create notification module and integrate Novu

Generate `notification` module with NestJS CLI:

```bash
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

## Create a Subscriber

The recipients of a triggered notification are called [subscribers](https://docs.novu.co/platform/subscribers).

Click “Subscribers” on the left sidebar of the Novu dashboard to see all subscribers. By default, the dashboard will display a subscriber, as you were added automatically during sign-up.

![subscriber_id.png](https://res.cloudinary.com/dxc6bnman/image/upload/v1688331839/Screenshot_2023-07-03_at_0.02.53_jmkhi3.png)

Create `notification.service.ts` file and inject Novu provider in class constructor. In `sendMail` method we create new subscriber. In real app replace `123` with subscriber ID of your user from database.

```ts
// notification.service.ts
import { Injectable } from '@nestjs/common';
import { Novu } from '@novu/node';
import { InjectNovu } from './novu.provider';

@Injectable()
export class NotificationService {
  constructor(
    @InjectNovu()
    private readonly novu: Novu
  ) {}

  async sendEmail(email: string, description: string) {
    await this.novu.subscribers.identify('123', {
      email: email,
      firstName: 'Subscriber',
      lastName: 'Lastname',
    });
  }
}
```

Other valid fields that can be used are `phone`, `avatar`, and `data` . The `data` field can accept an object of metadata that you want to attach to the subscriber.

:::info
To make all of your app users subscribers, you need to programmatically add them to Novu.
:::

## Trigger a Notification

Run trigger with same payload shape as we configured in Workflow editor previously:

```ts
// notification.service.ts
import { Injectable } from '@nestjs/common';
import { Novu } from '@novu/node';
import { InjectNovu } from './novu.provider';

@Injectable()
export class NotificationService {
  constructor(
    @InjectNovu()
    private readonly novu: Novu
  ) {}

  async sendEmail(email: string, description: string) {
    await this.novu.subscribers.identify('123', {
      email: email,
      firstName: 'Subscriber',
      lastName: 'Lastname',
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

Make sure you understand the following:

- First argument of trigger should be the notification template’s trigger ID/slug.

![trigger-id](https://github.com/michaldziuba03/novu/assets/43048524/4d95a839-c533-4b02-ac29-be9aef947ed2)

- The value of subscriberId is the id of the subscriber on Novu. In real app replace 123 with subscriber ID of your user from database.

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

```bash
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
