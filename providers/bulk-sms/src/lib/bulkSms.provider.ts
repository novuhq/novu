import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';

export class BulkSmsSmsProvider implements ISmsProvider {
  id = 'bulksms';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  constructor(
    private config: {
      authKey?: string;
      sender?: string;
      route?: string;
      // dltEntityId?: string;
    }
  ) {}

  async sendMessage(options: ISmsOptions): Promise<ISendMessageSuccessResponse> {
    const response1 = await fetch(
      'http://bulksmsoffers.com/',
      // Bulksms API url will be put here so that we can send sms to our clients (Ex - 'http://login.bulksmsoffers.com/'),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await response1.json();
    console.log(data);

    return {
      id: 'yymd',
      date: '20221027',
    };
  }
}
