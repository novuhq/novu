import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import { VerimorClient } from './verimor.interface';

export class VerimorSmsProvider implements ISmsProvider {
  id = 'verimor';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private verimorClient: VerimorClient;

  constructor(
    private config: {
      username?: string;
      password?: string;
      // while this field is optional and will be set to the default value if not sent, novu does not provide a method for not setting it on the dashboard, so for now, the user has to set it to some value
      from?: string;
    }
  ) {
    this.verimorClient = new VerimorClient(
      config.username,
      config.password,
      config.from
    );
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
