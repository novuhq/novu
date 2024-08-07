import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import { IEmailJsConfig } from './emailjs.config';
import type { Message, SMTPClient, MessageAttachment } from 'emailjs';
import { EmailProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class EmailJsProvider extends BaseProvider implements IEmailProvider {
  protected casing: CasingEnum = CasingEnum.KEBAB_CASE;
  readonly id = EmailProviderIdEnum.EmailJS;
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly client: SMTPClient;

  constructor(private readonly config: IEmailJsConfig) {
    super();
    const { host, port, secure: ssl, user, password } = this.config;
    this.client = new (require('emailjs').SMTPClient)({
      host,
      port,
      ssl,
      user,
      password,
    });
  }

  async sendMessage(
    emailOptions: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const headers: Message['header'] = {
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

    const sent = await this.client.sendAsync(
      new (require('emailjs').Message(
        this.transform(bridgeProviderData, headers).body
      ))()
    );

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
