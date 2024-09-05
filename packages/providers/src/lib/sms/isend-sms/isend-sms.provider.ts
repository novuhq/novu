import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export interface ISendSmsData {
  user_id: number;
  to: string;
  message: string;
  sms_type: 'unicode' | 'plain';
  status: string;
  sms_count: number;
  cost: number;
  sending_server_id: number;
  from: string;
  api_key: string;
  send_by: string;
  uid: string;
  updated_at: string;
  created_at: string;
  id: number;
}

export interface ISendSmsResponse {
  status: 'success' | 'error';
  message: string;
  data?: ISendSmsData;
}

export class ISendSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.ISendSms;
  protected casing = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  protected Instance: AxiosInstance;

  constructor(
    private config: {
      apiToken: string;
      from?: string;
      contentType?: ISendSmsData['sms_type'];
    },
  ) {
    super();
    this.Instance = axios.create({
      baseURL: 'https://send.com.ly',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiToken}`,
      },
    });
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, {
      sender_id: options.from ?? this.config.from,
      recipient: options.to.replace(/^\+|^00/, ''),
      type: this.config.contentType ?? 'unicode',
      message: options.content,
    }).body;

    const response = await this.Instance.post<ISendSmsResponse>(
      '/api/v3/sms/send',
      JSON.stringify(payload),
    );

    if (['success', 'error'].includes(response.data.status)) {
      if (response.data.status === 'success')
        return {
          id: response.data.data.uid,
          date: new Date().toISOString(),
        };
      else
        throw new Error(
          response.data.message ?? 'Unexpected response while sending the SMS!',
        );
    } else throw new Error('Something went wrong while sending the SMS!');
  }
}
