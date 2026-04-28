import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';

import { Attachment, EmailParams, MailerSend, Recipient, Sender } from 'mailersend';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class MailersendEmailProvider extends BaseProvider implements IEmailProvider {
  readonly id = EmailProviderIdEnum.MailerSend;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private mailerSend: MailerSend;

  constructor(
    private config: {
      apiKey: string;
      from?: string;
      senderName?: string;
    }
  ) {
    super();
    this.mailerSend = new MailerSend({ apiKey: this.config.apiKey });
  }

  private createRecipients(recipients: IEmailOptions['to']): Recipient[] {
    return Array.isArray(recipients)
      ? recipients.map((recipient) => new Recipient(recipient))
      : [new Recipient(recipients)];
  }

  private getAttachments(attachments: IEmailOptions['attachments']): Attachment[] | null {
    return attachments?.map(
      (attachment) =>
        new Attachment(
          attachment.file.toString('base64'),
          attachment.name,
          attachment.disposition ?? (attachment.cid ? 'inline' : 'attachment'),
          attachment.cid
        )
    );
  }

  private createMailData(options: IEmailOptions): EmailParams {
    const recipients = this.createRecipients(options.to);
    const attachments = this.getAttachments(options.attachments);

    const sentFrom = new Sender(options.from ?? this.config.from, options.senderName || this.config.senderName || '');

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
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
      const replyTo = new Sender(options.replyTo);
      emailParams.setReplyTo(replyTo);
    }

    const inReplyTo = Object.entries(options.headers ?? {}).find(
      ([headerName]) => headerName.toLowerCase() === 'in-reply-to'
    )?.[1];

    if (inReplyTo) {
      emailParams.setInReplyTo(inReplyTo);
    }

    return emailParams;
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const emailParams = this.transform(bridgeProviderData, this.createMailData(options)).body as unknown as EmailParams;
    const response = await this.mailerSend.email.send(emailParams);

    /**
     * For some reason the response object has changed in one of the versions of mailersend API.
     * The fallback treats the actual response object as an array of responses.
     */
    return {
      id: response.headers['x-message-id'],
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    const emailParams = this.createMailData(options);
    const emailSendResponse = await this.mailerSend.email.send(emailParams);
    const code = this.mapResponse(emailSendResponse.statusCode);

    if (code === CheckIntegrationResponseEnum.SUCCESS) {
      return {
        success: true,
        message: 'Integrated successfully!',
        code,
      };
    }

    const message = emailSendResponse.body?.message || 'Unknown error occurred';

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
