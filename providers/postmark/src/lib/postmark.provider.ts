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
import { Errors, ServerClient, Message, Models } from 'postmark';

export class PostmarkEmailProvider implements IEmailProvider {
  id = 'postmark';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private client: ServerClient;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {
    this.client = new ServerClient(this.config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const mailData = this.createMailData(options);
    const response = await this.client.sendEmail(mailData);

    return {
      id: response.MessageID,
      date: response.SubmittedAt,
    };
  }

  async checkIntegration(
    options: IEmailOptions
  ): Promise<ICheckIntegrationResponse> {
    try {
      const mailData = this.createMailData(options);
      await this.client.sendEmail(mailData);

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      if (error instanceof Errors.PostmarkError) {
        return {
          success: false,
          message: error?.message,
          code: mapError(error),
        };
      } else {
        return {
          success: false,
          message: error?.message,
          code: CheckIntegrationResponseEnum.FAILED,
        };
      }
    }
  }

  private createMailData(options: IEmailOptions): Message {
    const mailData: Message = {
      From: options.from || this.config.from,
      To: getFormattedTo(options.to),
      HtmlBody: options.html,
      TextBody: options.html,
      Subject: options.subject,
      Cc: getFormattedTo(options.cc),
      Bcc: getFormattedTo(options.bcc),
      Attachments: options.attachments?.map(
        (attachment) =>
          new Models.Attachment(
            attachment.name,
            attachment.file.toString('base64'),
            attachment.mime
          )
      ),
    };

    if (options.replyTo) {
      mailData.ReplyTo = options.replyTo;
    }

    return mailData;
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

    const status = this.getStatus(body.RecordType);

    if (status === undefined) {
      return undefined;
    }

    return {
      status: status,
      date: new Date().toISOString(),
      externalId: body.MessageID,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ? body.response : '',
      row: body,
    };
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case 'Open':
        return EmailEventStatusEnum.OPENED;
      case 'Click':
        return EmailEventStatusEnum.CLICKED;
      case 'Delivery':
        return EmailEventStatusEnum.DELIVERED;
      case 'Bounce':
        return EmailEventStatusEnum.BOUNCED;
      case 'SpamComplaint':
        return EmailEventStatusEnum.SPAM;
      case 'SubscriptionChange':
        return EmailEventStatusEnum.UNSUBSCRIBED;
    }
  }
}

const getFormattedTo = (to: string | string[]): string => {
  if (Array.isArray(to)) return to.join(', ');

  return to;
};

const mapError = (error: Errors.PostmarkError) => {
  if (error instanceof Errors.InvalidAPIKeyError) {
    return CheckIntegrationResponseEnum.BAD_CREDENTIALS;
  } else if (error instanceof Errors.ApiInputError) {
    // https://postmarkapp.com/developer/api/overview#error-codes
    switch (error.code) {
      case 10:
        return CheckIntegrationResponseEnum.BAD_CREDENTIALS;
      case 400:
      case 401:
        return CheckIntegrationResponseEnum.INVALID_EMAIL;
      default:
        return CheckIntegrationResponseEnum.FAILED;
    }
  } else {
    return CheckIntegrationResponseEnum.FAILED;
  }
};
