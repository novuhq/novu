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

export class KannelSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Kannel;
  apiBaseUrl: string;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(
    private config: {
      host: string;
      port: string;
      from: string;
      username?: string;
      password?: string;
    },
  ) {
    super();
    this.apiBaseUrl = `http://${config.host}:${config.port}/cgi-bin`;
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const url = `${this.apiBaseUrl}/sendsms`;
    const queryParameters = this.transform(bridgeProviderData, {
      username: this.config.username,
      password: this.config.password,
      from: options.from || this.config.from,
      to: options.to,
      text: options.content,
    }).body;

    const result = await axios.create().get(url, {
      params: queryParameters,
    });

    return {
      id: options.id,
      date: new Date().toDateString(),
    };
  }
}
