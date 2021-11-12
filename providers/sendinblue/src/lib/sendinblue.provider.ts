import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';

export class SendinblueEmailProvider implements IEmailProvider {
  id = 'sendinblue';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      apiKey: string;
    }
  ) {
    console.log(this.config);
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    console.log(options);
    return {
      id: 'PLACEHOLDER',
      date: 'PLACEHOLDER',
    };
  }
}
