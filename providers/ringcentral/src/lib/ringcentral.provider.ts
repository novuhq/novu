import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

const RC = require('@ringcentral/sdk').SDK;
require('dotenv').config();

const RECIPIENT = process.env.SMS_RECIPIENT;
const rcsdk = new RC({
  server: process.env.RC_SERVER_URL,
  clientId: process.env.RC_CLIENT_ID,
  clientSecret: process.env.RC_CLIENT_SECRET,
});

export class RingcentralSmsProvider implements ISmsProvider {
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  platform = rcsdk.platform();
  constructor(
    private config: {
      apiKey: string;
    }
  ) {
    this.platform.login({
      username: process.env.RC_USERNAME,
      password: process.env.RC_PASSWORD,
      extension: process.env.RC_EXTENSION,
    });

    this.platform.on(this.platform.events.loginSuccess, function (e) {});
  }

  async sendMessage(
    fromNumber: number,
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    try {
      const resp = await this.platform.get(
        '/restapi/v1.0/account/~/extension/~/phone-number'
      );
      const jsonObj = await resp.json();
      for (const record of jsonObj.records) {
        for (const feature of record.features) {
          if (feature == 'SmsSender') {
            const resp1 = await this.platform.post(
              '/restapi/v1.0/account/~/extension/~/sms',
              {
                from: { phoneNumber: record.phoneNumber },
                to: [{ phoneNumber: RECIPIENT }],
                text: 'Hello World from JavaScript',
              }
            );
            const jsonObj1 = await resp1.json();

            return {
              id: jsonObj1.id,
              date: jsonObj1.date,
            };
          }
        }
      }
    } catch (e) {
      process.exit(1);
    }
  }
}
