import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { IMailgunClient } from 'mailgun.js/interfaces/IMailgunClient';
import { MailgunMessageData } from 'mailgun.js/interfaces/Messages';

export class MailgunEmailProvider implements IEmailProvider {
  id = 'mailgun';

  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private mailgunClient: IMailgunClient;

  constructor(
    private config: {
      apiKey: string;
      baseUrl?: string;
      username: string;
      domain: string;
      from: string;
    }
  ) {
    const mailgun = new Mailgun(formData);

    this.mailgunClient = mailgun.client({
      username: config.username,
      key: config.apiKey,
      url: config.baseUrl || 'https://api.mailgun.net',
    });
  }

  async sendMessage(
    emailOptions: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const mailgunMessageData: Partial<MailgunMessageData> = {
      from: emailOptions.from || this.config.from,
      to: emailOptions.to,
      subject: emailOptions.subject,
      html: emailOptions.html,
      cc: emailOptions.cc?.join(','),
      bcc: emailOptions.bcc?.join(','),
      attachment: emailOptions.attachments?.map((attachment) => {
        return {
          data: attachment.file,
          filename: attachment.name,
        };
      }),
    };

    if (emailOptions.replyTo) {
      mailgunMessageData['h:Reply-To'] = emailOptions.replyTo;
    }

    const response = await this.mailgunClient.messages.create(
      this.config.domain,
      mailgunMessageData as MailgunMessageData
    );

    return {
      id: response.id,
      date: new Date().toISOString(),
    };
  }
  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    return {
      success: true,
      message: 'Integrated successfully!',
      code: CheckIntegrationResponseEnum.SUCCESS,
    };
  }
}
