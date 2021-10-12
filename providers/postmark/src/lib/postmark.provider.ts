import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';
import * as postmark from 'postmark';

export class PostmarkEmailProvider implements IEmailProvider {
  id = 'postmark';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private client: postmark.ServerClient;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {
    this.client = new postmark.ServerClient(this.config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    let to = options.to as string;

    if (Array.isArray(options.to)) to = options.to.join(', ');

    const response = await this.client.sendEmail({
      From: options.from || this.config.from,
      To: to,
      HtmlBody: options.html,
      TextBody: options.html,
      Subject: options.subject,
    });

    return {
      id: response.MessageID,
      date: response.SubmittedAt,
    };
  }
}
