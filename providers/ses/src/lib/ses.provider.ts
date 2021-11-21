import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';
import { SendEmailCommandInput, SESv2 } from '@aws-sdk/client-sesv2';
import { SESConfig } from './ses.config';

export class SESEmailProvider implements IEmailProvider {
  id = 'ses';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly client: SESv2;

  constructor(private readonly config: SESConfig) {
    this.client = new SESv2({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async sendMessage({
    html,
    text,
    to,
    from,
    subject,
  }: IEmailOptions): Promise<ISendMessageSuccessResponse> {
    const fromAddress = from ? from : this.config.from;
    const message: SendEmailCommandInput = {
      Content: {
        Simple: {
          Body: {},
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
        },
      },
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
      },
      FromEmailAddress: fromAddress,
      ReplyToAddresses: [fromAddress],
    };

    if (html && message?.Content?.Simple?.Body?.Html) {
      message.Content.Simple.Body.Html = {
        Data: html,
        Charset: 'UTF-8',
      };
    }

    if (text && message?.Content?.Simple?.Body?.Text) {
      message.Content.Simple.Body.Text = {
        Data: text,
        Charset: 'UTF-8',
      };
    }

    const result = await this.client.sendEmail(message);

    return {
      id: result.MessageId,
      date: new Date().toISOString(),
    };
  }
}
