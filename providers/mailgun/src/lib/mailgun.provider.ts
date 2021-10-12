import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import Client from 'mailgun.js/dist/lib/client';

export class MailgunEmailProvider implements IEmailProvider {
  id = 'mailgun';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private mailgunClient: Client;
  constructor(
    private config: {
      apiKey: string;
      username: string;
      domain: string;
      from: string;
    }
  ) {
    const mailgun = new Mailgun(formData);

    this.mailgunClient = mailgun.client({
      username: config.username,
      key: config.apiKey,
    });
  }

  async sendMessage(data: IEmailOptions): Promise<ISendMessageSuccessResponse> {
    const response = await this.mailgunClient.messages.create(
      this.config.domain,
      {
        from: data.from || this.config.from,
        to: [data.to],
        subject: data.subject,
        html: data.html,
      }
    );

    return {
      id: response.id,
      date: new Date().toISOString(),
    };
  }
}
