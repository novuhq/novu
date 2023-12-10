import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import { initializeApp, cert, deleteApp, getApp } from 'firebase-admin/app';
import {
  AndroidConfig,
  ApnsConfig,
  FcmOptions,
  getMessaging,
  Messaging,
  WebpushConfig,
} from 'firebase-admin/messaging';
import crypto from 'crypto';

export class FcmPushProvider implements IPushProvider {
  id = 'fcm';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private appName: string;
  private messaging: Messaging;
  constructor(
    private config: {
      projectId: string;
      email: string;
      secretKey: string;
    }
  ) {
    this.config = config;
    this.appName = crypto.randomBytes(32).toString();
    const firebase = initializeApp(
      {
        credential: cert({
          projectId: this.config.projectId,
          clientEmail: this.config.email,
          privateKey: this.config.secretKey,
        }),
      },
      this.appName
    );
    this.messaging = getMessaging(firebase);
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const {
      deviceTokens: _,
      type,
      android,
      apns,
      fcmOptions,
      webPush: webpush,
      data,
      ...overridesData
    } = (options.overrides as IPushOptions['overrides'] & {
      deviceTokens?: string[];
      webPush: { [key: string]: { [key: string]: string } | string };
    }) || {};

    const payload = this.cleanPayload(options.payload);

    let res;

    if (type === 'data') {
      res = await this.messaging.sendMulticast({
        tokens: options.target,
        data: {
          ...payload,
          title: options.title,
          body: options.content,
          message: options.content,
        },
        android,
        apns,
        fcmOptions,
        webpush,
      });
    } else {
      res = await this.messaging.sendMulticast({
        tokens: options.target,
        notification: {
          title: options.title,
          body: options.content,
          ...overridesData,
        },
        data,
        android,
        apns,
        fcmOptions,
        webpush,
      });
    }

    if (res.successCount === 0) {
      throw new Error(
        `Sending message failed due to "${
          res.responses.find((i) => i.success === false).error.message
        }"`
      );
    }

    const app = getApp(this.appName);
    await deleteApp(app);

    return {
      ids: res?.responses?.map((response, index) =>
        response.success
          ? response.messageId
          : `${response.error.message}. Invalid token:- ${options.target[index]}`
      ),
      date: new Date().toISOString(),
    };
  }

  private cleanPayload(payload: object): Record<string, string> {
    const cleanedPayload: Record<string, string> = {};

    Object.keys(payload).forEach((key) => {
      if (typeof payload[key] === 'string') {
        cleanedPayload[key] = payload[key];
      } else {
        cleanedPayload[key] = JSON.stringify(payload[key]);
      }
    });

    return cleanedPayload;
  }
}
