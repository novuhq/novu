import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';

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

export class ISendSmsProvider implements ISmsProvider {
  id = 'isend-sms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  protected Instance: AxiosInstance;

  constructor(
    private config: {
      apiToken: string;
      from?: string;
      contentType?: ISendSmsData['sms_type'];
    }
  ) {
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
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const payload = {
      sender_id: options.from ?? this.config.from,
      recipient: options.to.replace(/^\+|^00/, ''),
      type: this.config.contentType ?? 'unicode',
      message: options.content,
    };

    const response = await this.Instance.post<ISendSmsResponse>(
      '/api/v3/sms/send',
      JSON.stringify(payload)
    );

    if (['success', 'error'].includes(response.data.status)) {
      if (response.data.status === 'success')
        return {
          id: response.data.data.uid,
          date: new Date().toISOString(),
        };
      else
        throw new Error(
          response.data.message ?? 'Unexpected response while sending the SMS!'
        );
    } else throw new Error('Something went wrong while sending the SMS!');
  }
}
