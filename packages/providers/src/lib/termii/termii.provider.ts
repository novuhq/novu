import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
  ISMSEventBody,
} from '@novu/stateless';
import { SmsParams, MessageChannel, SmsJsonResponse } from './sms';

if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}

export class TermiiSmsProvider implements ISmsProvider {
  public static readonly BASE_URL = 'https://api.ng.termii.com/api/sms/send';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  id = 'termii';

  constructor(
    private config: {
      apiKey?: string;
      from?: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const params: SmsParams = {
      to: options.to,
      from: options.from || this.config.from,
      sms: options.content,
      type: 'plain',
      channel: MessageChannel.GENERIC,
      api_key: this.config.apiKey,
    };

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
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
      headers: headers,
      body: JSON.stringify(params),
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
    identifier: string
  ): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
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
      status: status,
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
    }
  }
}
