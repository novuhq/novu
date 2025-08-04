import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  type ISendMessageSuccessResponse,
  type ISMSEventBody,
  type ISmsOptions,
  type ISmsProvider,
  SmsEventStatusEnum,
} from '@novu/stateless';
import axios, { type AxiosInstance } from 'axios';

import { BaseProvider, CasingEnum } from '../../../base.provider';
import type { WithPassthrough } from '../../../utils/types';

interface IMediaSmsConfig {
  token: string;
  from?: string;
}

interface IMediaSendRequest {
  to: string;
  from: string;
  message: string;
  scheduled?: string;
  requestId?: string;
  useUnicode: number;
  type: number;
  telco?: string;
  priority?: number;
  isEncrypt?: number;
  ext?: Record<string, unknown>;
}

interface IMediaSendResponse {
  sendMessage: IMediaSendRequest;
  msgLength: number;
  mtCount: number;
  account: string;
  errorCode: string;
  errorMessage: string;
  referentId: string;
}

export class IMediaSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.IMedia;
  protected casing = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private axiosInstance: AxiosInstance;
  private static readonly BASE_URL = 'https://api.mobilebranding.vn';

  constructor(private config: IMediaSmsConfig) {
    super();

    this.axiosInstance = axios.create({
      baseURL: IMediaSmsProvider.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        token: this.config.token,
      },
    });
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, {
      to: options.to,
      from: options.from || this.config.from,
      message: options.content,
      scheduled: '',
      requestId: options.id || '',
      useUnicode: 1,
      type: 1,
    }).body;

    const response = await this.axiosInstance.request<IMediaSendResponse>({
      url: '/api/SMSBrandname/SendSMS',
      data: JSON.stringify(payload),
      method: 'POST',
    });

    if (response.data.errorCode !== '000') {
      throw new Error(`iMedia API error: ${response.data.errorCode} - ${response.data.errorMessage}`);
    }

    return {
      id: response.data.referentId,
      date: new Date().toISOString(),
    };
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.referentId || item.MessageSid);
    }

    return [body.referentId || body.MessageSid];
  }

  parseEventBody(body: any | any[], identifier: string): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => (item.referentId || item.MessageSid) === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.status || body.MessageStatus);

    if (status === undefined) {
      return undefined;
    }

    return {
      status,
      date: new Date().toISOString(),
      externalId: body.referentId || body.MessageSid,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ? body.response : '',
      row: body,
    };
  }

  private getStatus(event: string): SmsEventStatusEnum | undefined {
    switch (event?.toLowerCase()) {
      case 'accepted':
      case 'queued':
        return SmsEventStatusEnum.QUEUED;
      case 'sending':
        return SmsEventStatusEnum.SENDING;
      case 'sent':
        return SmsEventStatusEnum.SENT;
      case 'failed':
      case 'error':
        return SmsEventStatusEnum.FAILED;
      case 'delivered':
        return SmsEventStatusEnum.DELIVERED;
      case 'undelivered':
        return SmsEventStatusEnum.UNDELIVERED;
      default:
        return SmsEventStatusEnum.SENT;
    }
  }
}
