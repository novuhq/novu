import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

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
      server: string;
      clientId: string;
      clientSecret: string;
      extension?: string;
    }
  ) {
    this.rcsdk = new RingCentralSDK({
      server: config.server,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
    this.platform = this.rcsdk.platform();
  }

  async login(): Promise<boolean> {
    const isLoggedIn = await this.platform.loggedIn();
    if (isLoggedIn) return true;

    return await new Promise(async (resolve, reject) => {
      const result = await this.platform
        .login({
          username: this.config.username,
          password: this.config.password,
          extension: this.config.extension,
        })
        .then((response) => response.json())
        .catch((error) => {
          console.log(error);
        });
      console.log('Logging in to RingCentral', result);

      this.platform.on(this.platform.events.loginSuccess, function (e) {
        resolve(e);
      });
      this.platform.on(this.platform.events.loginError, function (e) {
        reject(e);
      });
    })
      .then(() => true)
      .catch(() => false);
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const isLoggedIn = await this.platform.loggedIn();
    if (!isLoggedIn) return;

    const result = await this.platform
      .post('/account/~/extension/~/sms', {
        text: options.content,
        to: [{ phoneNumber: options.to }],
        from: { phoneNumber: this.config.username },
      })
      .then((response) => response.json());

    return {
      id: result.id,
      date: result.creationTime,
    };
  }
}
