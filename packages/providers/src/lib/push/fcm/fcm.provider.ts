import { PushProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, IPushOptions, IPushProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import crypto from 'crypto';
import { cert, deleteApp, getApp, initializeApp } from 'firebase-admin/app';
import {
  ConditionMessage,
  getMessaging,
  Messaging,
  MulticastMessage,
  TokenMessage,
  TopicMessage,
} from 'firebase-admin/messaging';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

type FcmRoutingBody = Partial<TokenMessage & MulticastMessage & TopicMessage & ConditionMessage>;

export class FcmPushProvider extends BaseProvider implements IPushProvider {
  id = PushProviderIdEnum.FCM;
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  protected casing: CasingEnum = CasingEnum.NONE;

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
      ...overridesData
    } = (options.overrides as IPushOptions['overrides'] & {
      deviceTokens?: string[];
      webPush: { [key: string]: { [key: string]: string } | string };
    }) || {};

    const payload = this.cleanPayload(options.payload);
    const novuData = payload.__nvMessageId ? { __nvMessageId: payload.__nvMessageId } : {};
    const transformedBase = this.transform<FcmRoutingBody>(bridgeProviderData, {});
    const routing = (transformedBase?.body ?? {}) as FcmRoutingBody;

    const commonProps: Partial<MulticastMessage & TopicMessage & TokenMessage & ConditionMessage> = {
      android,
      apns,
      fcmOptions,
      webpush,
    };

    const notificationPayload = {
      notification: {
        title: options.title,
        body: options.content,
      },
      data: { ...novuData, ...data },
      ...commonProps,
    };

    let res;

    // Defensive precedence: token > tokens > topic > condition
    if (routing.token) {
      const tokenMessage = this.transform<TokenMessage>(bridgeProviderData, {
        token: routing.token,
        ...notificationPayload,
      }).body;

      res = await this.messaging.send(tokenMessage);
    } else if (!routing.tokens && routing.topic) {
      const topicMessage = this.transform<TopicMessage>(bridgeProviderData, {
        topic: routing.topic,
        ...notificationPayload,
      }).body;

      res = await this.messaging.send(topicMessage);
    } else if (!routing.tokens && routing.condition) {
      const conditionMessage = this.transform<ConditionMessage>(bridgeProviderData, {
        condition: routing.condition,
        ...notificationPayload,
      }).body;

      res = await this.messaging.send(conditionMessage);
    } else {
      const multicastConfig: Partial<MulticastMessage> = {
        tokens: options.target,
        ...commonProps,
      };

      // Add either data or notification based on type
      if (type === 'data') {
        multicastConfig.data = {
          ...payload,
          title: options.title,
          body: options.content,
          message: options.content,
        };
      } else {
        multicastConfig.notification = {
          title: options.title,
          body: options.content,
          ...overridesData,
        };
        multicastConfig.data = { ...novuData, ...data };
      }

      const multicastMessage = this.transform<MulticastMessage>(
        bridgeProviderData,
        multicastConfig as Record<string, unknown>
      ).body;

      res = await this.messaging.sendEachForMulticast(multicastMessage);
    }

    const app = getApp(this.appName);
    await deleteApp(app);

    // MulticastBatchResponse only; string message ids from send() leave successCount undefined
    if (typeof res !== 'string' && res.successCount === 0) {
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
