import axios from 'axios';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

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

export class FortySixElksSmsProvider implements ISmsProvider {
  id = 'forty-six-elks';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      user?: string;
      password?: string;
      from?: string;
    }
  ) {}

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const authKey = Buffer.from(
      this.config.user + ':' + this.config.password
    ).toString('base64');

    const data = new URLSearchParams({
      from: options.from || this.config.from,
      to: options.to,
      message: options.content,
    }).toString();

    const res: IFortySixElksRequestResponse = await axios.post(
      'https://api.46elks.com/a1/sms',
      data,
      {
        headers: {
          Authorization: 'Basic ' + authKey,
        },
      }
    );

    return {
      id: res.data.id,
      date: res.data.created,
    };
  }
}
