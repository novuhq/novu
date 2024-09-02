import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import { initializeApp, cert, deleteApp, getApp } from 'firebase-admin/app';
import {
  getMessaging,
  Messaging,
  MulticastMessage,
} from 'firebase-admin/messaging';
import crypto from 'crypto';
import { PushProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class FcmPushProvider extends BaseProvider implements IPushProvider {
  id = PushProviderIdEnum.FCM;
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;

  private appName: string;
  private messaging: Messaging;
  constructor(
    private config: {
      projectId: string;
      email: string;
      secretKey: string;
    },
  ) {
    super();
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
      this.appName,
    );
    this.messaging = getMessaging(firebase);
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
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
      res = await this.messaging.sendEachForMulticast(
        this.transform<MulticastMessage>(bridgeProviderData, {
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
        }).body,
      );
    } else {
      res = await this.messaging.sendEachForMulticast(
        this.transform<MulticastMessage>(bridgeProviderData, {
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
        }).body,
      );
    }

    if (res.successCount === 0) {
      throw new Error(
        `Sending message failed due to "${
          res.responses.find((i) => i.success === false).error.message
        }"`,
      );
    }

    const app = getApp(this.appName);
    await deleteApp(app);

    return {
      ids: res?.responses?.map((response, index) =>
        response.success
          ? response.messageId
          : `${response.error.message}. Invalid token:- ${options.target[index]}`,
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
