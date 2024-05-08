import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import { Client, ApiController } from '@bandwidth/messaging';
export class BandwidthSmsProvider implements ISmsProvider {
  id = 'bandwidth';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  public controller: ApiController;

  constructor(
    private config: {
      username: string;
      password: string;
      accountId: string;
    }
  ) {
    const client = new Client({
      basicAuthUserName: config.username,
      basicAuthPassword: config.password,
    });
    this.controller = new ApiController(client);
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const body = {
      applicationId: this.config.accountId,
      to: [options.to],
      from: options.from,
      text: options.content,
    };

    const createMessageResponse = await this.controller.createMessage(
      this.config.accountId,
      body
    );

    return {
      id: createMessageResponse.result.id,
      date: createMessageResponse.result.time,
    };
  }
}
