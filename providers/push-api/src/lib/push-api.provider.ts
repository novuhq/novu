import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import webpush from 'web-push';
import crypto from 'crypto';

class ErrorBase extends Error {
  constructor(message?: string) {
    super(message);

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class PushError extends ErrorBase {
  constructor(public readonly failures: webpush.SendResult[], message: string) {
    super();
    Object.setPrototypeOf(this, new.target.prototype);
    this.failures = failures;
    this.message =
      message +
      '\nFailures:\n' +
      failures.map((failure) => failure.statusCode).join('\n');
  }
}

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

  getId = () => crypto.randomBytes(20).toString('hex');

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const subscriptions = options.target;

    const failures: webpush.SendResult[] = [];
    const id = this.getId();

    for (const subscriptionString of subscriptions) {
      try {
        const decodedSubscription = Buffer.from(
          subscriptionString,
          'base64'
        ).toString('ascii');

        const subscription = JSON.parse(
          decodedSubscription
        ) as webpush.PushSubscription;

        const result = await this.sendPush(
          options.title,
          options.content,
          subscription
        );

        if (result.statusCode < 200 || result.statusCode >= 300) {
          failures.push(result);
        }
      } catch (err) {
        failures.push({
          statusCode: -1,
          body: err,
        } as webpush.SendResult);
      }
    }

    if (failures.length > 0) {
      throw new PushError(failures, `Sending message ${id} failed.`);
    }

    return {
      id,
      date: new Date().toISOString(),
    };
  }
}
