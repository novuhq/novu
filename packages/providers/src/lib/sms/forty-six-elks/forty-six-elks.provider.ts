import axios from 'axios';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import { SmsProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

interface IFortySixElksSuccessObject {
  status: string;
  direction: string;
  from: string;
  created: string;
  parts: number;
  to: string;
  cost: number;
  message: string;
  id: string;
}

interface IFortySixElksRequestResponse {
  data: IFortySixElksSuccessObject;
}

export class FortySixElksSmsProvider
  extends BaseProvider
  implements ISmsProvider
{
  id = SmsProviderIdEnum.FortySixElks;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(
    private config: {
      user?: string;
      password?: string;
      from?: string;
    },
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const authKey = Buffer.from(
      `${this.config.user}:${this.config.password}`,
    ).toString('base64');

    const transformedData = this.transform<Record<string, string>>(
      bridgeProviderData,
      {
        from: options.from || this.config.from,
        to: options.to,
        message: options.content,
      },
    );

    const data = new URLSearchParams(transformedData.body).toString();

    const res: IFortySixElksRequestResponse = await axios
      .create()
      .post('https://api.46elks.com/a1/sms', data, {
        headers: {
          Authorization: `Basic ${authKey}`,
          ...transformedData.headers,
        },
      });

    return {
      id: res.data.id,
      date: res.data.created,
    };
  }
}
