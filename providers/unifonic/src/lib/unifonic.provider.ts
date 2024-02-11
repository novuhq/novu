import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';

export class UnifonicSmsProvider implements ISmsProvider {
  public readonly DEFAULT_BASE_URL =
    'https://el.cloud.unifonic.com/rest/SMS/messages';
  id = 'unifonic';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      AppSid: string;
      SenderID: string;
    }
  ) { }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const data = {
      AppSid: this.config.AppSid,
      SenderID: this.config.SenderID,
      Recipient: options.to,
      Body: options.content,
    };

    const url = this.DEFAULT_BASE_URL;
    await axios.post(url, data).catch((e) => {
      throw new Error(
        e?.message?.length
          ? e.message
          : 'Some thing went wrong while calling unifonic'
      );
    });

    return {
      id: options.id,
      date: new Date().toISOString(),
    };
  }
}
