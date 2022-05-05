import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import '../config';
import { SDK as RingCentralSDK } from '@ringcentral/sdk';
import Platform from '@ringcentral/sdk/lib/platform/Platform';

export class RingCentralSmsProvider implements ISmsProvider {
  id = 'ringcentral';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private rcsdk: RingCentralSDK;
  private platform: Platform;

  constructor(
    private config: {
      username: string;
      password: string;
      from: string;
    }
  ) {
    this.rcsdk = new RingCentralSDK({ server: process.env.RC_SERVER_URL, clientSecret: process.env.RC_CLIENT_SECRET, clientId: process.env.RC_CLIENT_ID });
    this.platform = this.rcsdk.platform();
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const isLoggedIn = await this.platform.loggedIn();
    if (!isLoggedIn) {
      await new Promise((resolve, reject) => {

        this.platform.login({ username: this.config.username, password: this.config.password, extension: process.env.RC_EXTENSION_ID });
        this.platform.on(this.platform.events.loginSuccess, function(e) {
          resolve(e);
        });
        this.platform.on(this.platform.events.loginError, function(e) {
          throw new Error(e.message);
        })
      });
    }

    const result = await this.platform.post('/account/~/extension/~/sms', {
      text: options.content,
      to: [ { phoneNumber: options.to }],
      from: { phoneNumber: this.config.from },
    }).then(response => response.json());

    return {
      id: result.id,
      date: result.creationTime,
    };
  }
}
