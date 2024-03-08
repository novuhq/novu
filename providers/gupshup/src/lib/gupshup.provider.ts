import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';

if (!globalThis.fetch) {
  // eslint-disable-next-line global-require
  globalThis.fetch = require('node-fetch');
}

export class GupshupSmsProvider implements ISmsProvider {
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public static BASE_URL = 'https://enterprise.smsgupshup.com/GatewayAPI/rest';

  constructor(
    private config: {
      userId?: string;
      password?: string;
    }
  ) {}
  id: string;

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const params = {
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
    };

    const response = await axios.post(GupshupSmsProvider.BASE_URL, params);

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
