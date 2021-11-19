import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';

import SparkPost from 'sparkpost';
export class SparkpostEmailProvider implements IEmailProvider {
  id = 'sparkpost';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private sparkpostClient: SparkPost;
  constructor(
    private config: {
      apiKey: string;
    }
  ) {
this.sparkpostClient = SparkPost(config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {

const response= this.sparkpostClient.transmissions.send({
  options: {
    sandbox: true
  },
  content: {
    from: options.from,
    subject: options.subject,
    html:options.html
  },
  recipients: [
    {address: options.to}
  ]
});

    return {
      id: response.id,
      date: new Date().toISOString()
    };
  }
}
