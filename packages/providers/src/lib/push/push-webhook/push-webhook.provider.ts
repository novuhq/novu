import { PushProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, IPushOptions, IPushProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import axios from 'axios';
import crypto from 'crypto';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class PushWebhookPushProvider extends BaseProvider implements IPushProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = PushProviderIdEnum.PushWebhook;
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  constructor(
    private config: {
      hmacSecretKey?: string;
      webhookUrl: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { subscriber, step, payload, ...rest } = options;
    const data = this.transform(bridgeProviderData, {
      ...rest,
      payload: {
        ...payload,
        subscriber,
        step,
      },
    });

    const hmacSecretKey = (data.body.hmacSecretKey as string) || this.config.hmacSecretKey;
    const webhookUrl = (data.body.webhookUrl as string) || this.config.webhookUrl;

    // Clean up override fields from the body before sending
    if (data.body.hmacSecretKey) {
      delete data.body.hmacSecretKey;
    }
    if (data.body.webhookUrl) {
      delete data.body.webhookUrl;
    }

    const body = this.createBody(data.body);
    const hmacValue = this.computeHmac(body, hmacSecretKey);

    const response = await axios.create().post(webhookUrl, body, {
      headers: {
        'content-type': 'application/json',
        'X-Novu-Signature': hmacValue,
        ...data.headers,
      },
    });

    return {
      id: response.data.id,
      date: new Date().toDateString(),
    };
  }

  createBody(options: object): string {
    return JSON.stringify(options);
  }

  computeHmac(payload: string, hmacSecretKey: string): string {
    const secretKey = hmacSecretKey;

    return crypto.createHmac('sha256', secretKey).update(payload, 'utf-8').digest('hex');
  }
}
