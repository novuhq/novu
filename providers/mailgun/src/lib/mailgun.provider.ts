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

  async sendMessage(data: IEmailOptions): Promise<ISendMessageSuccessResponse> {
    const response = await this.mailgunClient.messages.create(
      this.config.domain,
      {
        from: data.from || this.config.from,
        to: data.to,
        subject: data.subject,
        html: data.html,
        attachment: data.attachments?.map((attachment) => {
          return {
            data: attachment.file,
            filename: attachment.name,
          };
        }),
      }
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
