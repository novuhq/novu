import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';

import { MailService } from '@sendgrid/mail';

export class SendgridEmailProvider implements IEmailProvider {
  id = 'sendgrid';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private sendgridMail: MailService;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {
    this.sendgridMail = new MailService();
    this.sendgridMail.setApiKey(this.config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.sendgridMail.send({
      from: options.from || this.config.from,
      to: options.to,
      html: options.html,
      subject: options.subject,
      substitutions: {},
      attachments: options.attachments?.map((attachment) => {
        return {
          content: attachment.file.toString('base64'),
          filename: attachment.name,
          type: attachment.mime,
        };
      }),
    });

    return {
      id: response[0]?.headers['x-message-id'],
      date: response[0]?.headers?.date,
    };
  }
}
