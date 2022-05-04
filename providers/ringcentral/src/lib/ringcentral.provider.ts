import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import '../config';
import { SDK as RingCentralSDK } from '@ringcentral/sdk';

export class RingCentralSmsProvider implements ISmsProvider {
  id = 'ringcentral';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private ringCentralClient: RingCentralSDK;

  constructor(
    private config: {
      clientId: string;
      clientSecret: string;
      from: string;
    }
  ) {
    this.ringCentralClient = new RingCentralSDK({ clientId: config.clientId, clientSecret: config.clientSecret });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const result = await this.ringCentralClient.post('/restapi/v1.0/account/~/extension/~/sms', {
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
