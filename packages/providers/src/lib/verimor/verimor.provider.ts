import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import { VerimorClient } from './verimor.interface';

export class VerimorSmsProvider implements ISmsProvider {
  id = 'twilio';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private verimorClient: VerimorClient;

  constructor(
    private config: {
      username?: string;
      password?: string;
      from?: string;
    }
  ) {
    this.verimorClient = new VerimorClient(config.username, config.password);
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const verimorResponse = await this.verimorClient.send({
      source_addr: this.config.from,
      messages: [
        {
          dest: options.to,
          msg: options.content,
        },
      ],
    });

    return {
      id: verimorResponse.id,
    };
  }
}
