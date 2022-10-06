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
import { ServerClient, Models } from 'postmark';

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
    const response = await this.client.sendEmail({
      From: options.from || this.config.from,
      To: getFormattedTo(options.to),
      HtmlBody: options.html,
      TextBody: options.html,
      Subject: options.subject,
      Attachments: options.attachments?.map(
        (attachment) =>
          new Models.Attachment(
            attachment.name,
            attachment.file.toString(),
            attachment.mime
          )
      ),
    });

    return {
      id: response.MessageID,
      date: response.SubmittedAt,
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
        return EmailEventStatusEnum.SPAM_COMPLAINED;
      case 'SubscriptionChange':
        return EmailEventStatusEnum.SUBSCRIPTION_CHANGED;
    }
  }
}

const getFormattedTo = (to: string | string[]): string => {
  if (Array.isArray(to)) return to.join(', ');

  return to;
};
