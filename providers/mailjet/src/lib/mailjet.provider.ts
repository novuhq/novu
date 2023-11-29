import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
  IEmailEventBody,
  EmailEventStatusEnum,
} from '@novu/stateless';
import * as Mailjet from 'node-mailjet';

const MAILJET_API_VERSION = 'v3.1';

export class MailjetEmailProvider implements IEmailProvider {
  id = 'mailjet';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private mailjetClient: Mailjet.Client;
  constructor(
    private config: {
      apiKey: string;
      apiSecret: string;
      from: string;
      senderName: string;
    }
  ) {
    this.mailjetClient = new Mailjet.Client({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
    });
  }

  async sendMessage(
    emailOptions: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.mailjetClient
      .post('send', {
        version: MAILJET_API_VERSION,
      })
      .request<Mailjet.SendEmailV3_1.Response>(
        this.createMailData(emailOptions)
      );

    const { body, response: clientResponse } = response;

    return {
      id: clientResponse.headers['x-mj-request-guid'],
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    const send = this.mailjetClient.post('send', {
      version: MAILJET_API_VERSION,
    });
    const requestObject = this.createMailData(options);
    try {
      await send.request(requestObject);

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        code: CheckIntegrationResponseEnum.BAD_CREDENTIALS,
      };
    }
  }

  private createMailData(options: IEmailOptions): Mailjet.SendEmailV3_1.Body {
    const message: Mailjet.SendEmailV3_1.Message = {
      From: {
        Email: options.from || this.config.from,
        Name: options.senderName || this.config.senderName,
      },
      To: options.to.map((email) => ({
        Email: email,
      })) as Mailjet.SendEmailV3_1.EmailAddressTo[],
      Cc: options.cc?.map((ccItem) => ({ Email: ccItem })),
      Bcc: options.bcc?.map((ccItem) => ({ Email: ccItem })),
      Subject: options.subject,
      TextPart: options.text,
      HTMLPart: options.html,
      Attachments: options.attachments?.map((attachment) => ({
        ContentType: attachment.mime,
        Filename: attachment.name,
        Base64Content: attachment.file.toString('base64'),
      })),
    };

    if (options.replyTo) {
      message.ReplyTo.Email = options.replyTo;
    }

    return {
      Messages: [message],
    };
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.MessageID);
    }

    return [body.MessageID];
  }

  parseEventBody(
    body: any | any[],
    identifier: string
  ): IEmailEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item.MessageID === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.event);

    if (status === undefined) {
      return undefined;
    }

    return {
      status: status,
      date: new Date().toISOString(),
      externalId: body.MessageID,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ?? '',
      row: body,
    };
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case 'open':
        return EmailEventStatusEnum.OPENED;
      case 'bounce':
        return EmailEventStatusEnum.BOUNCED;
      case 'click':
        return EmailEventStatusEnum.CLICKED;
      case 'sent':
        return EmailEventStatusEnum.SENT;
      case 'blocked':
        return EmailEventStatusEnum.BLOCKED;
      case 'spam':
        return EmailEventStatusEnum.SPAM;
      case 'unsub':
        return EmailEventStatusEnum.UNSUBSCRIBED;
    }
  }
}
