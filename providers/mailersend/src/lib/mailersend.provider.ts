import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
} from '@novu/stateless';

import MailerSend, { EmailParams, Recipient, Attachment } from 'mailersend';

export class MailersendEmailProvider implements IEmailProvider {
  readonly id = 'mailersend';
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private mailerSend: MailerSend;

  constructor(
    private config: {
      apiKey: string;
    }
  ) {
    this.mailerSend = new MailerSend({ api_key: this.config.apiKey });
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    let recipients;
    if (Array.isArray(options.to)) {
      recipients = options.to.map((recipient) => {
        return new Recipient(recipient);
      });
    } else {
      recipients = new Recipient(options.to);
    }

    const attachments = options.attachments?.map((attachment) => {
      return new Attachment(
        attachment.file.toString('base64'),
        attachment.name
      );
    });

    const emailParams = new EmailParams()
      .setFrom(options.from)
      .setRecipients(recipients)
      .setSubject(options.subject)
      .setHtml(options.html)
      .setText(options.text)
      .setAttachments(attachments);

    const response = await this.mailerSend.send(emailParams);

    return {
      id: response[0]?.['X-Message-Id'],
      date: new Date().toISOString(),
    };
  }
}
