import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import { randomUUID } from 'crypto';
import axios from 'axios';

export class SparkPostEmailProvider implements IEmailProvider {
  readonly id = 'sparkpost';
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      apiKey: string;
      eu: boolean;
      from: string;
      senderName: string;
    }
  ) {}

  async sendMessage({
    from,
    to,
    subject,
    text,
    html,
    attachments,
  }: IEmailOptions): Promise<ISendMessageSuccessResponse> {
    const recipients: { address: { email: string } }[] = to.map(
      (recipient) => ({
        address: {
          email: recipient,
        },
      })
    );

    const files: Array<{ name: string; type: string; data: string }> = [];

    attachments.forEach((attachment) => {
      files.push({
        name: attachment.name || randomUUID(),
        type: attachment.mime,
        data: attachment.file.toString('base64'),
      });
    });

    const endpoint = this.config.eu
      ? 'https://api.eu.sparkpost.com/api/v1/transmissions'
      : 'https://api.sparkpost.com/api/v1/transmissions';

    const content = {
      from: {
        name: this.config.senderName,
        email: from || this.config.from,
      },
      subject,
      text,
      html,
      attachments: files,
    };

    const requestData = {
      recipients,
      content,
    };

    const response = await axios.post(endpoint, requestData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    const sent = response.data;

    return {
      id: sent.results.id,
    };
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      await this.sendMessage({
        to: ['no-reply@novu.co'],
        from: this.config.from || options.from,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message,
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }
}
