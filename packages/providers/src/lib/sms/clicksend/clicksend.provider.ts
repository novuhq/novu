import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class ClicksendSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Clicksend;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(
    private config: {
      username: string;
      apiKey: string;
    },
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, {
      to: options.to,
      body: options.content,
    });
    const response = await axios.create().post(
      'https://rest.clicksend.com/v3/sms/send',
      {
        messages: [data.body],
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${this.config.username}:${this.config.apiKey}`,
          ).toString('base64')}`,
          ...data.headers,
        },
      },
    );

    return {
      id: response.data.data.messages[0].message_id,
      date: response.data.data.messages[0].date,
    };
  }
}
