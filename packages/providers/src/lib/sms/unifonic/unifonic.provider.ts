import { SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import axios from 'axios';
import qs from 'qs';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

interface IUnifonicConfig {
  appSid: string;
  senderId: string;
}

export class UnifonicSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Unifonic;
  channelType = ChannelTypeEnum.SMS as const;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: IUnifonicConfig) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, {
      AppSid: this.config.appSid,
      SenderID: this.config.senderId,
      Recipient: options.to,
      Body: options.content,
      responseType: 'JSON',
      baseEncode: true,
    });

    const response = await axios.post('https://el.cloud.unifonic.com/rest/SMS/messages', qs.stringify(payload.body), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data?.messageID) {
      return {
        id: response.data.messageID,
        date: new Date().toISOString(),
      };
    }

    throw new Error(`Unifonic SMS failed: ${JSON.stringify(response.data || {})}`);
  }
}
