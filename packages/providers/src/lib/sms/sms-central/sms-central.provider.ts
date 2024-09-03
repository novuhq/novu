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

export class SmsCentralSmsProvider
  extends BaseProvider
  implements ISmsProvider
{
  public readonly DEFAULT_BASE_URL = 'https://my.smscentral.com.au/api/v3.2';
  id = SmsProviderIdEnum.SmsCentral;
  protected casing = CasingEnum.CONSTANT_CASE;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      username: string;
      password: string;
      from: string;
      baseUrl?: string;
    },
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, {
      ACTION: 'send',
      ORIGINATOR: options.from || this.config.from,
      USERNAME: this.config.username,
      PASSWORD: this.config.password,
      RECIPIENT: options.to,
      MESSAGE_TEXT: options.content,
    }).body;

    const url = this.config.baseUrl || this.DEFAULT_BASE_URL;
    await axios.create().post(url, data);

    return {
      id: options.id,
      date: new Date().toISOString(),
    };
  }
}
