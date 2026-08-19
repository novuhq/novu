import { PushProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, IPushOptions, IPushProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import crypto from 'crypto';
import { cert, deleteApp, getApp, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging, MulticastMessage, TopicMessage } from 'firebase-admin/messaging';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class FcmPushProvider extends BaseProvider implements IPushProvider {
  id = PushProviderIdEnum.FCM;
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;

  private readonly INVALID_TOKEN_ERRORS = ['Requested entity was not found'];

  private appName: string;
  private messaging: Messaging;
  constructor(
    private config: {
      projectId: string;
      email: string;
      secretKey: string;
    }
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
      this.appName
    );
    this.messaging = getMessaging(firebase);
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const {
      deviceTokens: _,
      type,
      android,
      apns,
      fcmOptions,
      webPush: webpush,
      data,
      notification: notificationOverride,
      topic: _topic,
      tokens: _tokens,
      ...overridesData
    } = (options.overrides as IPushOptions['overrides'] & {
      deviceTokens?: string[];
      notification?: Record<string, unknown>;
      topic?: string;
      tokens?: string[];
      webPush: { [key: string]: { [key: string]: string } | string };
    }) || {};

    const payload = this.cleanPayload(options.payload);
    const novuData = payload.__nvMessageId ? { __nvMessageId: payload.__nvMessageId } : {};
    const transformedBase = this.transform<MulticastMessage | TopicMessage>(bridgeProviderData, {});
    const isDataMessage = type === 'data' || (transformedBase.body as { type?: string })?.type === 'data';

    const commonProps: Partial<MulticastMessage & TopicMessage> = {
      android,
      apns,
      fcmOptions,
      webpush,
    };

    const notificationPayload = {
      title: options.title,
      body: options.content,
      ...(notificationOverride || {}),
      ...overridesData,
    };

    let res;

    if ((transformedBase?.body as TopicMessage).topic) {
      const topicConfig: Partial<TopicMessage> = {
        topic: (transformedBase.body as TopicMessage).topic,
        ...commonProps,
      };

      if (isDataMessage) {
        topicConfig.data = {
          ...payload,
          ...(data || {}),
          title: options.title,
          body: options.content,
          message: options.content,
        };
      } else {
        topicConfig.notification = notificationPayload;
        topicConfig.data = { ...novuData, ...(data || {}) };
      }

      const topicMessage = this.transform<TopicMessage>(
        bridgeProviderData,
        topicConfig as Record<string, unknown>
      ).body;

      // `type` is a Novu control field, not an FCM message field
      delete (topicMessage as { type?: string }).type;

      res = await this.messaging.send(topicMessage);
    } else {
      const multicastConfig: Partial<MulticastMessage> = {
        tokens: options.target,
        ...commonProps,
      };

      if (isDataMessage) {
        multicastConfig.data = {
          ...payload,
          ...(data || {}),
          title: options.title,
          body: options.content,
          message: options.content,
        };
      } else {
        multicastConfig.notification = notificationPayload;
        multicastConfig.data = { ...novuData, ...(data || {}) };
      }

      const multicastMessage = this.transform<MulticastMessage>(
        bridgeProviderData,
        multicastConfig as Record<string, unknown>
      ).body;

      // `type` is a Novu control field, not an FCM message field
      delete (multicastMessage as { type?: string }).type;

      res = await this.messaging.sendEachForMulticast(multicastMessage);
    }

    const app = getApp(this.appName);
    await deleteApp(app);

    if (res.successCount === 0) {
      throw new Error(
        `Sending message failed due to "${res.responses.find((i) => i.success === false).error.message}"`
      );
    }

    return {
      ids:
        typeof res === 'string'
          ? [res]
          : res?.responses?.map((response, index) =>
              response.success
                ? response.messageId
                : `${response.error.message}. Invalid token:- ${options.target[index]}`
            ),
      date: new Date().toISOString(),
    };
  }

  isTokenInvalid(errorMessage: string): boolean {
    return this.INVALID_TOKEN_ERRORS.some((error) => errorMessage?.includes(error));
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
