import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
} from '@novu/stateless';

import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class AfroSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.AfroSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;
  private readonly BASE_URL = 'https://api.afromessage.com';
  private readonly ENDPOINT = '/api/send';

  constructor(
    private config: {
      apiKey?: string;
      senderName?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const url = `${this.BASE_URL}${this.ENDPOINT}`;

    const queryParams = {
      from: options.from,
      to: options.to,
      message: options.content,
    };

    const { data } = await axios.get(url, {
      params: this.transform(bridgeProviderData, queryParams).body,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    console.log(data);

    if (data.acknowledge !== 'success') {
      throw new Error(`AfroSMS error: ${data.response || 'Unknown error'}`);
    }

    return {
      id: data.response?.message_id || data.response?.id || 'unknown',
      date: new Date().toISOString(),
    };
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.message_id || item.id || 'unknown');
    }

    return [body.message_id || body.id || 'unknown'];
  }

  parseEventBody(body: any | any[], identifier: string): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
      // eslint-disable-next-line no-param-reassign
      body = body.find((item) => item.message_id === identifier || item.id === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.status);

    if (status === undefined) {
      return undefined;
    }

    return {
      status,
      date: new Date().toISOString(),
      externalId: body.message_id || body.id,
      attempts: body.attempts ? parseInt(body.attempts, 10) : 1,
      response: body.response ? body.response : '',
      row: body,
    };
  }

  private getStatus(event: string): SmsEventStatusEnum | undefined {
    switch (event) {
      case 'sent':
        return SmsEventStatusEnum.SENT;
      case 'delivered':
        return SmsEventStatusEnum.DELIVERED;
      case 'failed':
        return SmsEventStatusEnum.FAILED;
      default:
        return undefined;
    }
  }
}
