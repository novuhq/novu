import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
} from '@novu/stateless';

import axios, { Axios } from 'axios';

export class ClickatellSmsProvider implements ISmsProvider {
  id = 'clickatell';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private axios: Axios;

  constructor(
    private config: {
      apiKey?: string;
      isTwoWayIntegration?: boolean;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const url = 'https://platform.clickatell.com/messages';

    const data = {
      to: [options.to],
      ...(this.config.isTwoWayIntegration && { from: options.from }),
      content: options.content,
      binary: true,
    };

    const response = await axios({
      headers: {
        Authorization: this.config.apiKey,
      },
      data,
      method: 'post',
      url,
    });

    return {
      id: response.data?.messages[0]?.apiMessageId,
      date: new Date().toISOString(),
    };
  }
}
