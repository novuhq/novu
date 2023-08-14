---
sidebar_position: 13
sidebar_label: Get started with NestJS
---

# NestJS Quickstart

Learn how to use Novu to quickly send multi-channel (SMS, Email, Chat, Push) notifications from a NestJS app.

In this Quickstart, you will learn how to:

- Install the Novu Node.js SDK via npm.
- Use Novu Node.js SDK with NestJS dependency injection.
- Create subscribers.
- Send your first notification.
- Send notifications via topics.

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

After installing dependencies, we need to connect app with our Novu account using the Novu API key. Simply log onto the [Novu web dashboard](https://web.novu.co) and from the settings there, obtain your API key. We’ll use it to connect our app to our Novu account.

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

Create `notification.service.ts` file and inject Novu instance in class constructor. In `createSubscriber` method we create new subscriber. In real app you may want to use this method after user registration. Use user's unique identifier from database for `subscriberId`.

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

  async createSubscriber(subscriberId: string, email: string) {
    const result = await this.novu.subscribers.identify(subscriberId, {
      email,
      firstName: 'Subscriber',
    });

    return result.data;
  }
}
```

Other valid fields that can be used are `phone`, `avatar`, and `data` . The `data` field can accept an object of metadata that you want to attach to the subscriber.

:::info
To make all of your app users subscribers, you need to programmatically add them to Novu.
:::

## Trigger a Notification

Run trigger inside `sendEmail` method with same payload shape as we configured in Workflow editor previously:

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

  async createSubscriber(subscriberId: string, email: string) {
    const result = await this.novu.subscribers.identify(subscriberId, {
      email,
      firstName: 'Subscriber',
    });

    return result.data;
  }

  async sendEmail(subscriberId: string, email: string, description: string) {
    const result = await this.novu.trigger('email-quickstart', {
      to: {
        subscriberId,
        email,
      },
      payload: {
        email,
        description,
      },
    });

    return result.data;
  }
}
```

> Novu will update subscriber if you provide different email than previously for specific `subscriberId`.

Make sure you understand the following:

- First argument of trigger should be the notification template’s trigger ID/slug.

![trigger-id](https://github.com/michaldziuba03/novu/assets/43048524/4d95a839-c533-4b02-ac29-be9aef947ed2)

- The value of subscriberId is the id of the subscriber on Novu we created previously.

## Create the route for sending notifications

We also have to create `notification.controller.ts` file inside notification module and create endpoint for creating subscribers and sending emails:

```ts
// notification.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('subscribers')
  createSubscriber(@Body() body: { subscriberId: string; email: string }) {
    return this.notificationService.createSubscriber(body.subscriberId, body.email);
  }

  @Post('emails')
  sendEmail(@Body() body: { subscriberId: string; email: string; description: string }) {
    return this.notificationService.sendEmail(body.subscriberId, body.email, body.description);
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

Next, let's open Postman or other similar tool to test our endpoint. Send a POST request and create new subscriber.

![Create subscriber in Postman](https://github.com/michaldziuba03/novu/assets/43048524/60c96cd5-9c28-47ed-9313-7354d4506ec0)

> In place of email field, use your actual email.

With subscriber created, now we can actually send our first email to this subscriber.

![Send emails in Postman](https://github.com/michaldziuba03/novu/assets/43048524/d9d9f0f9-c6bc-4b49-afc1-1a8798cfe37b)

This means that the email notification was sent successfully. Now go to your inbox and you should see an email notification like the following:

![email-screenshot](https://github.com/michaldziuba03/novu/assets/43048524/d5c97ae2-07c1-4e6c-b9a4-0c82ac4e6681)

## Topics

Novu simplifies the process of triggering notifications to multiple subscribers with an API called "Topics". By utilizing the Topics API, you can effortlessly manage bulk notifications easily.

Each topic is uniquely identified by a custom key specified by the user, serving as the primary identifier for interacting with the Topics API.

This intuitive approach streamlines notifications management, empowering users to focus on delivering targeted messages to their subscribers without the hassle of intricate implementation details.

> Make sure that you use a unique key for a Topic. Keys once used, can’t be changed later!

You have the flexibility to assign a descriptive name to a topic. Unlike the topic key, this name does not require uniqueness and can be modified using the provided API.

A topic can have multiple subscribers associated with it. These subscribers will receive notifications whenever a notification is dispatched to the respective topic.

### Create a topic

You can create a topic using two entities - `key` and `name`. Keys are unique identifiers for topics and a name is just something you assign to a topic for convenience.

```ts
// notification.service.ts
import { Injectable } from '@nestjs/common';
import { Novu, TriggerRecipientsTypeEnum } from '@novu/node';
import { InjectNovu } from './novu.provider';

@Injectable()
export class NotificationService {
  constructor(
    @InjectNovu()
    private readonly novu: Novu,
  ) {}

  ...

  async createTopic(key: string, name: string) {
    const result = await this.novu.topics.create({
      key,
      name,
    });

    return result.data;
  }
}
```

## Add subscriber to a Topic

The code for adding a subscriber to a previously created topic is as follows:

:::info
Note: You can only add those subscribers to a topic that you've already created. You can see all the subscribers in the [Novu web dashboard](https://web.novu.co/subscribers)
:::

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

  ...

  async createTopic(key: string, name: string) {
    const result = await this.novu.topics.create({
      key,
      name,
    });

    return result.data;
  }

  async addTopicSubscriber(key: string, subscriberId: string) {
    const result = await this.novu.topics.addSubscribers(key, {
      subscribers: [subscriberId],
    });

    return result.data;
  }
}
```

## Sending notifications to a topic

Sending notifications to a topic is not a complex task. You need to extract the topic key to which you want to send notifications and trigger Novu’s method on that topic key with the message in the payload:

```ts
// notification.service.ts
import { Injectable } from '@nestjs/common';
import { Novu, TriggerRecipientsTypeEnum } from '@novu/node';
import { InjectNovu } from './novu.provider';

@Injectable()
export class NotificationService {
  constructor(
    @InjectNovu()
    private readonly novu: Novu,
  ) {}

  ...

  async createTopic(key: string, name: string) {
    const result = await this.novu.topics.create({
      key,
      name,
    });

    return result.data;
  }

  async addTopicSubscriber(key: string, subscriberId: string) {
    const result = await this.novu.topics.addSubscribers(key, {
      subscribers: [subscriberId],
    });

    return result.data;
  }

  async sendTopicNotification(key: string, description: string) {
    const result = await this.novu.trigger('email-quickstart', {
      to: [{ type: TriggerRecipientsTypeEnum.TOPIC, topicKey: key }],
      payload: { description },
    });

    return result.data;
  }
}
```

> Value behind `TriggerRecipientsTypeEnum.TOPIC` is string `"Topic"`.

## Create routes for topics

In notification controller add remaining routes for topics.

```ts
// notification.controller.ts
import { Body, Controller, Param, Post } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  ...

  @Post('topics')
  createTopic(@Body() body: { key: string; name: string }) {
    return this.notificationService.createTopic(body.key, body.name);
  }

  @Post('topics/:key/subscribers')
  addSubscriberToTopic(
    @Param('key') key: string,
    @Body('subscriberId') subscriberId: string,
  ) {
    return this.notificationService.addTopicSubscriber(key, subscriberId);
  }

  @Post('topics/:key/send')
  sendTopicNotification(
    @Param('key') key: string,
    @Body('description') description: string,
  ) {
    return this.notificationService.sendTopicNotification(key, description);
  }
}
```

We can test our endpoints in Postman. First, create new topic:

![Create topic in Postman](https://github.com/michaldziuba03/novu/assets/43048524/e5300572-96da-4a41-83a9-89d1d4976925)

> Note how the return object contains the key I sent from my request body. That signals successful creation!

Let's add subscriber to the topic we created previously:

![Add subscriber to topic in Postman](https://github.com/michaldziuba03/novu/assets/43048524/d22da38b-d42f-4bf1-a696-53d501512bbe)

The returned array will contain the subscriberID that we had passed in the request body, signalling that it was added to the topic successfully.

If, on the other hand, you find the passed subscriberId in the notFound array inside the failed object, it means the subscriber wasn't added to the topic.

You can read more about it [here](https://docs.novu.co/platform/topics/#subscribers-management-in-a-topic).

Finally we can send notification to the topic:

![Trigger topic notification in Postman](https://github.com/michaldziuba03/novu/assets/43048524/e45028d9-abb2-442a-be8f-3b38eae4e0a4)

> You can create more subscribers and add them to the topic to test this feature.

Now each topic subscriber should see email message in their inboxes:

![image](https://github.com/michaldziuba03/novu/assets/43048524/a82593f1-574f-42dc-89ac-8a70700157eb)

## Next Steps

Great job! If you've reached this point, you should now have successfully created a subscriber, notification template, configured a channel provider and triggered a notification in your application.

To learn more about notifications and explore Novu's features and capabilities, check out:

- [Novu Digest Engine](https://docs.novu.co/platform/digest) - Learn how to aggregate multiple trigger events into a single message and deliver it to the subscriber.
- [Novu Notification Center](https://docs.novu.co/notification-center/getting-started) - Learn how to integrate a rich, ready-to-use real-time UI notification center into your app.
