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
import {
  SendSmtpEmail,
  SendSmtpEmailTo,
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
} from '@sendinblue/client';

export class SendinblueEmailProvider implements IEmailProvider {
  id = 'sendinblue';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private transactionalEmailsApi: TransactionalEmailsApi;

  constructor(
    private config: {
      apiKey: string;
    }
  ) {
    this.transactionalEmailsApi = new TransactionalEmailsApi();
    this.transactionalEmailsApi.setApiKey(
      TransactionalEmailsApiApiKeys.apiKey,
      this.config.apiKey
    );
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const email = new SendSmtpEmail();
    email.sender = { email: options.from || options.from };
    email.to = getFormattedTo(options.to);
    email.subject = options.subject;
    email.htmlContent = options.html;
    email.textContent = options.text;
    email.attachment = options.attachments?.map((attachment) => ({
      name: attachment?.name,
      content: attachment?.file?.toString(),
      contentType: attachment.mime,
    }));

    const { response, body } =
      await this.transactionalEmailsApi.sendTransacEmail(email);

    return {
      id: body?.messageId,
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
      date: body.date,
      externalId: body.id,
      row: body,
    };
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case 'sent':
        return EmailEventStatusEnum.SENT;
      case 'request':
        return EmailEventStatusEnum.REQUEST;
      case 'delivered':
        return EmailEventStatusEnum.DELIVERED;
      case 'hardBounce':
        return EmailEventStatusEnum.HARD_BOUNCE;
      case 'softBounce':
        return EmailEventStatusEnum.SOFT_BOUNCE;
      case 'blocked':
        return EmailEventStatusEnum.BLOCKED;
      case 'spam':
        return EmailEventStatusEnum.SPAM;
      case 'invalid':
        return EmailEventStatusEnum.INVALID;
      case 'deferred':
        return EmailEventStatusEnum.DEFERRED;
      case 'click':
        return EmailEventStatusEnum.CLICKED;
      case 'opened':
        return EmailEventStatusEnum.OPENED;
      case 'uniqueOpened':
        return EmailEventStatusEnum.UNIQUE_OPENED;
      case 'unsubscribed':
        return EmailEventStatusEnum.UNSUBSCRIBED;
      case 'listAddition':
        return EmailEventStatusEnum.LIST_ADDITION;
      case 'inboundEmailProcessed':
        return EmailEventStatusEnum.INBOUND_EMAIL_PROCESSED;
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

function getFormattedTo(to: string | string[]): SendSmtpEmailTo[] {
  if (typeof to === 'string') {
    return [{ email: to }];
  }

  return to.map((email: string) => ({ email }));
}
