import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';

import MailerSend, { EmailParams, Recipient, Attachment } from 'mailersend';

export class MailersendEmailProvider implements IEmailProvider {
  readonly id = 'mailersend';
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private mailerSend: MailerSend;

  constructor(
    private config: {
      apiKey: string;
      from?: string;
      senderName?: string;
    }
  ) {
    this.mailerSend = new MailerSend({ api_key: this.config.apiKey });
  }

  private createRecipients(recipients: IEmailOptions['to']): Recipient[] {
    return Array.isArray(recipients)
      ? recipients.map((recipient) => new Recipient(recipient))
      : [new Recipient(recipients)];
  }

  private getAttachments(
    attachments: IEmailOptions['attachments']
  ): Attachment[] | null {
    return attachments?.map(
      (attachment) =>
        new Attachment(attachment.file.toString('base64'), attachment.name)
    );
  }

  private createMailData(options: IEmailOptions): EmailParams {
    const recipients = this.createRecipients(options.to);
    const attachments = this.getAttachments(options.attachments);

    const emailParams = new EmailParams()
      .setFrom(options.from ?? this.config.from)
      .setFromName(options.senderName || this.config.senderName || '')
      .setRecipients(recipients)
      .setSubject(options.subject)
      .setHtml(options.html)
      .setText(options.text)
      .setAttachments(attachments)
      .setPersonalization(options.customData.personalization)
      .setTemplateId(options.customData.templateId);

    if (options.cc && Array.isArray(options.cc)) {
      emailParams.setCc(options.cc.map((ccItem) => new Recipient(ccItem)));
    }

    if (options.bcc && Array.isArray(options.bcc)) {
      emailParams.setBcc(options.bcc.map((ccItem) => new Recipient(ccItem)));
    }

    if (options.replyTo) {
      emailParams.setReplyTo(options.replyTo);
    }

    return emailParams;
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const emailParams = this.createMailData(options);
    const response = await this.mailerSend.send(emailParams);

    return {
      id: response[0]?.['X-Message-Id'],
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    const emailParams = this.createMailData(options);
    const emailSendResponse = await this.mailerSend.send(emailParams);
    const code = this.mapResponse(emailSendResponse.status);

    if (emailSendResponse.ok && code === CheckIntegrationResponseEnum.SUCCESS) {
      return {
        success: true,
        message: 'Integrated successfully!',
        code,
      };
    }

    const message = await emailSendResponse
      .json()
      .then((res) => res?.message || 'Unknown error occurred')
      .catch(() => 'Unknown error occurred');

    return {
      success: false,
      message,
      code,
    };
  }

  private mapResponse(status: number) {
    switch (status) {
      case 200: // The request was accepted.
      case 201: // Resource was created.
      case 202: // The request was accepted and further actions are taken in the background.
      case 204: // The request was accepted and there is no content to return.
        return CheckIntegrationResponseEnum.SUCCESS;
      case 401: // The provided API token is invalid.
      case 403: // The action is denied for that account or a particular API token.
        return CheckIntegrationResponseEnum.BAD_CREDENTIALS;

      default:
        return CheckIntegrationResponseEnum.FAILED;
    }
  }
}
