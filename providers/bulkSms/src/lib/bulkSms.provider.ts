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
    console.log(options);
    const response1 = await fetch(
      'http://login.bulksmsoffers.com/api/sendhttp.php?authkey=273131Adqyvkvd5cb99570&mobiles=7735993629&message=1234 is your OTP. Thanks ITPL&sender=iSUPAS&route=OTP&DLT_TE_ID=1107161555177329736',
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
