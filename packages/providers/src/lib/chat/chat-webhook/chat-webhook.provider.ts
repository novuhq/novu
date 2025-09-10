import { ChatProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  IChatOptions,
  IChatProvider,
  ISendMessageSuccessResponse,
  isChannelDataOfType,
} from '@novu/stateless';
import axios from 'axios';
import crypto from 'crypto';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class ChatWebhookProvider extends BaseProvider implements IChatProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  readonly id = ChatProviderIdEnum.ChatWebhook;
  channelType = ChannelTypeEnum.CHAT as ChannelTypeEnum.CHAT;

  constructor(
    private config: {
      hmacSecretKey?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: IChatOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    if (!isChannelDataOfType(options.channelData, ENDPOINT_TYPES.WEBHOOK)) {
      throw new Error('Invalid channel data for ChatWebhook provider');
    }

    const { content, channelData, phoneNumber } = options;
    const { endpoint } = channelData;

    const data = this.transform(bridgeProviderData, {
      content,
      webhookUrl: endpoint.url,
      channel: endpoint.channel,
      phoneNumber,
    });
    const body = this.createBody(data.body);

    const hmacSecretKey = (data.body.hmacSecretKey as string) || this.config.hmacSecretKey;
    const hmacValue = this.computeHmac(body, hmacSecretKey);

    if (data.body.hmacSecretKey as string) {
      delete data.body.hmacSecretKey;
    }

    const response = await axios.create().post((data?.body?.webhookUrl as string) || endpoint.url, body, {
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

  computeHmac(payload: string, hmacSecretKey?: string): string {
    const secretKey = hmacSecretKey;
    if (!secretKey) {
      return;
    }

    return crypto.createHmac('sha256', secretKey).update(payload, 'utf-8').digest('hex');
  }
}
