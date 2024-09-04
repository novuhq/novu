import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
  ISMSEventBody,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { SmsParams, MessageChannel, SmsJsonResponse } from './sms';

export class TermiiSmsProvider extends BaseProvider implements ISmsProvider {
  public static readonly BASE_URL = 'https://api.ng.termii.com/api/sms/send';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;
  id = SmsProviderIdEnum.Termii;

  constructor(
    private config: {
      apiKey?: string;
      from?: string;
    },
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const params = this.transform<SmsParams>(bridgeProviderData, {
      to: options.to,
      from: options.from || this.config.from,
      sms: options.content,
      type: 'plain',
      channel: MessageChannel.GENERIC,
      api_key: this.config.apiKey,
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...params.headers,
    };
    const opts: RequestInit = {
      agent: undefined,
      cache: undefined,
      credentials: undefined,
      mode: undefined,
      redirect: undefined,
      referrerPolicy: undefined,
      signal: undefined,
      method: 'POST',
      headers,
      body: JSON.stringify(params.body),
    };

    const response = await fetch(TermiiSmsProvider.BASE_URL, opts);
    const body = (await response.json()) as SmsJsonResponse;

    return {
      id: body.message_id,
      date: new Date().toISOString(),
    };
  }
  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.message_id);
    }

    return [body.message_id];
  }

  parseEventBody(
    body: any | any[],
    identifier: string,
  ): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
      // eslint-disable-next-line no-param-reassign
      body = body.find((item) => item.message_id === identifier);
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
      externalId: body.message_id,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ? body.response : '',
      row: body,
    };
  }

  private getStatus(event: string): SmsEventStatusEnum | undefined {
    switch (event) {
      case 'Message sent':
        return SmsEventStatusEnum.SENT;
      case 'Message failed':
      case 'Rejected':
        return SmsEventStatusEnum.FAILED;
      case 'Delivered':
        return SmsEventStatusEnum.DELIVERED;
      default:
        return undefined;
    }
  }
}
