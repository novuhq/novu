import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';
import Client, { Email } from 'node-mailjet';
import { MailjetResponse } from './mailjet-response.interface';

const MAILJET_API_VERSION = 'v3.1';

export class MailjetEmailProvider implements IEmailProvider {
  id = 'mailjet';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private mailjetClient: Email.Client;
  constructor(
    private config: {
      apiKey: string;
      apiSecret: string;
      from: string;
    }
  ) {
    this.mailjetClient = Client.connect(config.apiKey, config.apiSecret);
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const send = this.mailjetClient.post('send', {
      version: MAILJET_API_VERSION,
    });
    const requestObject = {
      Messages: [
        {
          From: {
            Email: options.from || this.config.from,
          },
          To: [
            {
              Email: options.to,
            },
          ],
          Subject: options.subject,
          TextPart: options.text,
          HTMLPart: options.html,
        },
      ],
    };

    const response = (await send.request(requestObject)) as MailjetResponse;

    return {
      id: response.response.header['x-mj-request-guid'],
      date: response.response.header.date,
    };
  }
}
