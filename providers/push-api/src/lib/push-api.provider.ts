import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import webpush from 'web-push';
import crypto from 'crypto';

export class PushApiPushProvider implements IPushProvider {
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  id: 'push-api';

  constructor(
    private config: {
      vapidPrivateKey: string;
      vapidPublicKey: string;
    }
  ) {}

  async sendPush(
    title: string,
    content: string,
    subscription: webpush.PushSubscription
  ) {
    const pushOptions: webpush.RequestOptions = {
      vapidDetails: {
        subject: 'mailto:support@novu.co',
        privateKey: this.config.vapidPrivateKey,
        publicKey: this.config.vapidPublicKey,
      },
    };

    return await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title,
        body: content,
      }),
      pushOptions
    );
  }

  getId() {
    try {
      console.log('generating crypto');
      const randomBytes = crypto?.randomBytes(20);
      console.log('bytes', randomBytes);
      const hex = randomBytes?.toString('hex');
      console.log('tohex', hex);

      return hex;
    } catch (err) {
      console.log(err);
    }
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const subscriptions = options.target;
    console.log(options, subscriptions);

    const failures: webpush.SendResult[] = [];
    console.log('random crypto');
    let id = this.getId();
    if (id === undefined) {
      id = 'non-random-id';
    }
    console.log('id', id);
    for (const subscriptionString of subscriptions) {
      try {
        console.log('decoding subscription...');
        const decodedSubscription = Buffer.from(
          subscriptionString,
          'base64'
        ).toString('ascii');
        console.log('deecoded', decodedSubscription);

        const subscription = JSON.parse(
          decodedSubscription
        ) as webpush.PushSubscription;

        console.log(subscription);

        const result = await this.sendPush(
          options.title,
          options.content,
          subscription
        );

        if (result.statusCode >= 200 && result.statusCode < 300) {
          console.log(result);
          failures.push(result);
          console.log('bad status');
        }
        console.log('good status');
      } catch (err) {
        console.log('err occurred', err);
        failures.push(err);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Sending message ${id} failed.`);
    }

    return {
      id,
      date: new Date().toISOString(),
    };
  }
}
