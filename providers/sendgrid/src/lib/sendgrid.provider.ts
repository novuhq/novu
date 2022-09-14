import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
} from '@novu/stateless';

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
    const mailData = this.createMailData(options);
    const response = await this.sendgridMail.send(mailData);

    return {
      id: response[0]?.headers['x-message-id'],
      date: response[0]?.headers?.date,
    };
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      const mailData = this.createMailData(options);

      const response = await this.sendgridMail.send(mailData);

      if (response[0]?.statusCode === 202) {
        return {
          success: true,
          message: 'Integration Successful',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error?.response?.body?.errors[0]?.message,
      };
    }

    /*
     * if (response.statusCode !== 202) {
     *   const data = await response.json();
     *   throw new Error(data?.errors[0]?.message);
     * }
     */
  }

  private createMailData(options: IEmailOptions) {
    return {
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
    };
  }
}
