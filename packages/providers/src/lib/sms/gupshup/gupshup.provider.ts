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

export class GupshupSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Gupshup;
  protected casing = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public static BASE_URL = 'https://enterprise.smsgupshup.com/GatewayAPI/rest';

  constructor(
    private config: {
      userId?: string;
      password?: string;
    },
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const params = this.transform(bridgeProviderData, {
      send_to: options.to,
      msg: options.content,
      msg_type: 'text',
      auth_scheme: 'plain',
      method: 'sendMessage',
      format: 'text',
      v: '1.1',
      userid: this.config.userId,
      password: this.config.password,
      ...(options.customData?.principalEntityId && {
        principalEntityId: options.customData?.principalEntityId,
      }),
      ...(options.customData?.dltTemplateId && {
        dltTemplateId: options.customData?.dltTemplateId,
      }),
    }).body;

    const response = await axios
      .create()
      .post(GupshupSmsProvider.BASE_URL, params);

    const body = response.data;
    const result = body.split(' | ');

    if (result[0] === 'error') {
      throw new Error(`${result[1]} ${result[2]}`);
    }

    return {
      id: result[2],
      date: new Date().toISOString(),
    };
  }
}
