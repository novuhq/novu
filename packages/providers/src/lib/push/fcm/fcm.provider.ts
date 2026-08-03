import { FCM_ROUTING_KEYS, PushProviderIdEnum } from '@novu/shared';
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

type FcmRouting = {
  token?: string;
  tokens?: string[];
  topic?: string;
  condition?: string;
};

type FcmSingleTarget = Pick<TokenMessage, 'token'> | Pick<TopicMessage, 'topic'> | Pick<ConditionMessage, 'condition'>;

type FcmSendPlan = { kind: 'single'; target: FcmSingleTarget } | { kind: 'multicast'; tokens: string[] };

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
    // Read routing from known bridge keys only — `_passthrough` must not choose the send plan.
    const sendPlan = this.resolveSendPlan(this.readRouting(bridgeProviderData), options.target);
    const bridgeWithoutRouting = this.omitRoutingKeys(bridgeProviderData);

    const commonProps = {
      android,
      apns,
      fcmOptions,
      webpush,
    };

    let res;

    if (sendPlan.kind === 'single') {
      const message = this.transform<TokenMessage | TopicMessage | ConditionMessage>(bridgeWithoutRouting, {
        ...sendPlan.target,
        notification: {
          title: options.title,
          body: options.content,
        },
        data: { ...novuData, ...data },
        ...commonProps,
      }).body;

      res = await this.messaging.send(message);
    } else {
      const multicastConfig: Partial<MulticastMessage> = {
        tokens: sendPlan.tokens,
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
        bridgeWithoutRouting,
        multicastConfig as Record<string, unknown>
      ).body;

      res = await this.messaging.sendEachForMulticast(multicastMessage);
    }

    const app = getApp(this.appName);
    await deleteApp(app);

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

  private readRouting(bridgeProviderData: WithPassthrough<Record<string, unknown>>): FcmRouting {
    const routing: FcmRouting = {};

    if (typeof bridgeProviderData.token === 'string') {
      routing.token = bridgeProviderData.token;
    }

    if (Array.isArray(bridgeProviderData.tokens)) {
      routing.tokens = bridgeProviderData.tokens as string[];
    }

    if (typeof bridgeProviderData.topic === 'string') {
      routing.topic = bridgeProviderData.topic;
    }

    if (typeof bridgeProviderData.condition === 'string') {
      routing.condition = bridgeProviderData.condition;
    }

    return routing;
  }

  /** Precedence: token > tokens (multicast) > topic > condition > default multicast */
  private resolveSendPlan(routing: FcmRouting, subscriberTargets: string[]): FcmSendPlan {
    if (routing.token) {
      return { kind: 'single', target: { token: routing.token } };
    }

    if (Array.isArray(routing.tokens)) {
      return { kind: 'multicast', tokens: routing.tokens };
    }

    if (routing.topic) {
      return { kind: 'single', target: { topic: routing.topic } };
    }

    if (routing.condition) {
      return { kind: 'single', target: { condition: routing.condition } };
    }

    return { kind: 'multicast', tokens: subscriberTargets };
  }

  private omitRoutingKeys(
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): WithPassthrough<Record<string, unknown>> {
    const rest = { ...bridgeProviderData };

    for (const key of FCM_ROUTING_KEYS) {
      delete rest[key];
    }

    return rest;
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
