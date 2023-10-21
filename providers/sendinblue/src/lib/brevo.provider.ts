import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  EmailEventStatusEnum,
  ICheckIntegrationResponse,
  IEmailEventBody,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';

const brevo = require('@getbrevo/brevo');

export class BrevoEmailProvider implements IEmailProvider {
  id = 'brevo';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  apiKey: {
    apiKey: string;
  };
  private defaultClient: any;
  private transactionalEmailsApi: {
    sendTransacEmail: (email: unknown) => Promise<unknown>;
  };

  constructor(
    private config: {
      apiKey: string;
      from: string;
      senderName: string;
    }
  ) {
    this.defaultClient = brevo.ApiClient.instance;
    this.apiKey = this.defaultClient.authentications['api-key'];
    this.apiKey.apiKey = config.apiKey;
    this.transactionalEmailsApi = new brevo.TransactionalEmailsApi();
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const email = new brevo.SendSmtpEmail();
    email.sender = {
      email: options.from || this.config.from,
      name: this.config.senderName,
    };
    email.to = getFormattedTo(options.to);
    email.subject = options.subject;
    email.htmlContent = options.html;
    email.textContent = options.text;
    email.attachment = options.attachments?.map((attachment) => ({
      name: attachment?.name,
      content: attachment?.file.toString('base64'),
    }));

    if (options.cc?.length) {
      email.cc = options.cc?.map((ccItem) => ({ email: ccItem }));
    }

    if (options?.bcc?.length) {
      email.bcc = options.bcc?.map((ccItem) => ({ email: ccItem }));
    }

    if (options.replyTo) {
      email.replyTo.email = options.replyTo;
    }

    const response: Record<string, any> =
      await this.transactionalEmailsApi.sendTransacEmail(email);

    return {
      id: response?.messageId,
      date: response?.headers?.date,
    };
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item['message-id']);
    }

    return [body['message-id']];
  }

  parseEventBody(
    body: any | any[],
    identifier: string
  ): IEmailEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item['message-id'] === identifier);
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
      date: new Date(body.date).toISOString(),
      externalId: body.id,
      row: body,
    };
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case 'opened':
      case 'uniqueOpened':
      case 'proxy_open':
        return EmailEventStatusEnum.OPENED;
      case 'request':
      case 'delivered':
      case 'complaint':
        return EmailEventStatusEnum.DELIVERED;
      case 'hardBounce':
      case 'softBounce':
      case 'blocked':
      case 'unsubscribed':
        return EmailEventStatusEnum.BOUNCED;
      case 'click':
        return EmailEventStatusEnum.CLICKED;
      case 'invalid_email':
      case 'error':
        return EmailEventStatusEnum.DROPPED;
      // case 'deferred':
    }
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

function getFormattedTo(to: string | string[]): { email: string }[] {
  if (typeof to === 'string') {
    return [{ email: to }];
  }

  return to.map((email: string) => ({ email }));
}
