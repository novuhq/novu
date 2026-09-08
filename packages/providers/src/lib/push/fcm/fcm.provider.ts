import { FCM_ROUTING_KEYS, PushProviderIdEnum, resolveExclusiveRoutingKeys } from '@novu/shared';
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

    // `_passthrough.body` may choose the destination, as the top of the override chain — the same
    // priority `transform` gives its content keys.
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
        ...this.buildContent(options, { type, data }),
        ...commonProps,
      }).body;

      res = await this.messaging.send(message);
    } else {
      const multicastMessage = this.transform<MulticastMessage>(bridgeWithoutRouting, {
        tokens: sendPlan.tokens,
        ...this.buildContent(options, { type, data, notificationOverrides: overridesData }),
        ...commonProps,
      }).body;

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

  /**
   * Shapes the title/body of a message, shared by both send paths so a data-only message looks the
   * same whether it goes to `tokens`, a `token`, a `topic` or a `condition`. `type: 'data'` keeps
   * FCM from rendering a notification itself: the payload and the copy ride inside `data` for the
   * client to render. `notificationOverrides` only applies to the multicast path.
   */
  private buildContent(
    options: IPushOptions,
    {
      type,
      data,
      notificationOverrides,
    }: {
      type?: 'notification' | 'data';
      data?: Record<string, string>;
      notificationOverrides?: Record<string, unknown>;
    }
  ): Pick<MulticastMessage, 'notification' | 'data'> {
    const payload = this.cleanPayload(options.payload);

    if (type === 'data') {
      return {
        data: {
          ...payload,
          title: options.title,
          body: options.content,
          message: options.content,
        },
      };
    }

    const novuData = payload.__nvMessageId ? { __nvMessageId: payload.__nvMessageId } : {};

    return {
      notification: {
        title: options.title,
        body: options.content,
        ...notificationOverrides,
      },
      data: { ...novuData, ...data },
    };
  }

  /**
   * Routing is claimed by the highest layer that sets a usable destination — `_passthrough.body`
   * before the schematized keys — as a single key in `FCM_ROUTING_KEYS` order, so a passthrough
   * `topic` cannot blend with a lower-layer `tokens`.
   */
  private readRouting(bridgeProviderData: WithPassthrough<Record<string, unknown>>): FcmRouting {
    const claimed = resolveExclusiveRoutingKeys(bridgeProviderData, [FCM_ROUTING_KEYS]);

    if (typeof claimed.token === 'string') {
      return { token: claimed.token };
    }

    if (typeof claimed.topic === 'string') {
      return { topic: claimed.topic };
    }

    if (typeof claimed.condition === 'string') {
      return { condition: claimed.condition };
    }

    if (Array.isArray(claimed.tokens)) {
      return { tokens: claimed.tokens };
    }

    return {};
  }

  /**
   * Maps an already-exclusive `routing` claim (from `readRouting`) onto a send plan.
   * Same-layer precedence lives only in `FCM_ROUTING_KEYS` — `routing` has at most one key.
   */
  private resolveSendPlan(routing: FcmRouting, subscriberTargets: string[]): FcmSendPlan {
    if (routing.token) {
      return { kind: 'single', target: { token: routing.token } };
    }

    if (routing.topic) {
      return { kind: 'single', target: { topic: routing.topic } };
    }

    if (routing.condition) {
      return { kind: 'single', target: { condition: routing.condition } };
    }

    if (Array.isArray(routing.tokens)) {
      return { kind: 'multicast', tokens: routing.tokens };
    }

    return { kind: 'multicast', tokens: subscriberTargets };
  }

  /**
   * Clears every routing key from both layers so only `sendPlan.target` puts a destination back on
   * the message. FCM addresses one destination per send, and the losing keys would otherwise ride
   * along through `transform`.
   */
  private omitRoutingKeys(
    bridgeProviderData: WithPassthrough<Record<string, unknown>>
  ): WithPassthrough<Record<string, unknown>> {
    const rest = { ...bridgeProviderData };

    for (const key of FCM_ROUTING_KEYS) {
      delete rest[key];
    }

    if (rest._passthrough?.body && typeof rest._passthrough.body === 'object') {
      const body = { ...rest._passthrough.body };
      for (const key of FCM_ROUTING_KEYS) {
        delete body[key];
      }

      rest._passthrough = {
        ...rest._passthrough,
        body,
      };
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
