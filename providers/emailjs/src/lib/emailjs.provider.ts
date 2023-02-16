import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import { Message, SMTPClient, MessageAttachment } from 'emailjs';
import { IEmailJsConfig } from './emailjs.config';
import { MessageHeaders } from 'emailjs/smtp/message';

export class EmailJsProvider implements IEmailProvider {
  readonly id = 'emailjs';
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly client: SMTPClient;

  constructor(private readonly config: IEmailJsConfig) {
    const { host, port, secure: ssl, user, password } = this.config;
    this.client = new SMTPClient({
      host,
      port,
      ssl,
      user,
      password,
    });
  }

  async sendMessage(
    emailOptions: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const headers: Partial<MessageHeaders> = {
      from: emailOptions.from || this.config.from,
      to: emailOptions.to,
      subject: emailOptions.subject,
      text: emailOptions.text,
      attachment: this.mapAttachments(emailOptions),
      cc: emailOptions.cc,
      bcc: emailOptions.bcc,
    };

    if (emailOptions.replyTo) {
      headers['reply-to'] = emailOptions.replyTo;
    }

    const sent = await this.client.sendAsync(new Message(headers));

    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: sent.header['message-id']!,
      date: sent.header.date,
    };
  }

  private mapAttachments(emailOptions: IEmailOptions) {
    const attachmentsModel: MessageAttachment[] = emailOptions.attachments
      ? emailOptions.attachments.map((attachment) => {
          return {
            name: attachment.name,
            data: attachment.file.toString('base64'),
            type: attachment.mime,
          };
        })
      : [];

    attachmentsModel?.push({ data: emailOptions.html, alternative: true });

    return attachmentsModel;
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
