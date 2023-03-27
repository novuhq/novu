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
    delete (options.overrides as { deviceTokens?: string[] })?.deviceTokens;

    const overridesData = options.overrides || ({} as any);

    const androidData: AndroidConfig = overridesData.android;
    const apnsData: ApnsConfig = overridesData.apns;
    const fcmOptionsData: FcmOptions = overridesData.fcmOptions;
    const webPushData: WebpushConfig = overridesData.webPush;
    delete overridesData.android;
    delete overridesData.apns;
    delete overridesData.fcmOptions;
    delete overridesData.webPush;

    let res;

    if (overridesData?.type === 'data') {
      delete (options.overrides as { type?: string })?.type;
      res = await this.messaging.sendMulticast({
        tokens: options.target,
        data: options.payload as { [key: string]: string },
        ...(androidData ? { android: androidData } : {}),
        ...(apnsData ? { apns: apnsData } : {}),
        ...(fcmOptionsData ? { fcmOptions: fcmOptionsData } : {}),
        ...(webPushData ? { webpush: webPushData } : {}),
      });
    } else {
      const { data, ...overrides } = overridesData;

      res = await this.messaging.sendMulticast({
        tokens: options.target,
        notification: {
          title: options.title,
          body: options.content,
          ...overrides,
        },
        data,
        ...(androidData ? { android: androidData } : {}),
        ...(apnsData ? { apns: apnsData } : {}),
        ...(fcmOptionsData ? { fcmOptions: fcmOptionsData } : {}),
        ...(webPushData ? { webpush: webPushData } : {}),
      });
    }

    if (res.failureCount > 0) {
      throw new Error(
        `Sending message failed due to "${
          res.responses.find((i) => i.success === false).error.message
        }"`
      );
    }

    const app = getApp(this.appName);
    await deleteApp(app);

    return {
      ids: res?.responses?.map((response) => response.messageId),
      date: new Date().toISOString(),
    };
  }
}
