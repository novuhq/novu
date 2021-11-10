import { ChannelTypeEnum, ISmsOptions, ISmsProvider } from '@notifire/core';
import whispirSDK from 'whispir-node-sdk';

export class WhispirSmsProvider implements ISmsProvider {
  id = 'whispir';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private whispirClient: typeof whispirSDK;

  constructor(
    private config: {
      username: string;
      password: string;
      apiKey: string;
    }
  ) {
    this.whispirClient = new whispirSDK(config.username, config.password, config.apiKey);
  }

   async sendMessage(options: ISmsOptions): Promise<any> {
    return await this.whispirClient.SMS()
    .to(options.to)
    .body(options.content)
    .subject('');
  }
}