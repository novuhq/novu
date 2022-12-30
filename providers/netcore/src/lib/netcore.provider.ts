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

export enum NetCoreStatusEnum {
  OPENED = 'open',
  SENT = 'send',
  BOUNCED = 'bounce',
  DROPPED = 'drop',
  CLICKED = 'click',
  SPAM = 'spam',
  INVALID = 'invalid',
  UNSUBSCRIBED = 'unsub',
}

export class NetCoreProvider implements IEmailProvider {
  id = 'netcore';

  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  netcoreLib: any;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {}

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    this.netcoreLib = await import('pepipost/lib');

    this.netcoreLib.Configuration.apiKey = this.config.apiKey;

    const controller = this.netcoreLib.MailSendController;
    const body = new this.netcoreLib.Send();

    body.from = new this.netcoreLib.From();
    body.from.email = options.from || this.config.from;
    body.subject = options.subject;

    body.content = [];
    body.content[0] = new this.netcoreLib.Content();
    body.content[0].type = this.netcoreLib.TypeEnum.HTML;
    body.content[0].value = options.html;

    body.personalizations = [];
    body.personalizations[0] = new this.netcoreLib.Personalizations();
    body.personalizations[0].to = [];
    body.personalizations[0].to[0] = new this.netcoreLib.EmailStruct();
    body.personalizations[0].to[0].email = options.to;

    body.personalizations[0].attachments = options.attachments?.map(
      (attachment) => {
        const attachmentPayload = new this.netcoreLib.Attachments();
        attachmentPayload.content = attachment.file.toString('base64');
        attachmentPayload.filename = attachment.name;

        return attachment;
      }
    );

    const response = await controller.createGeneratethemailsendrequest(body);

    return {
      id: response?.data?.message_id,
      date: new Date().toISOString(),
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
      return body.map((item) => item.['TRANSID']);
    }

    return [body.['TRANSID']];
  }

  parseEventBody(
    body: any | any[],
    identifier: string
  ): IEmailEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item.['TRANSID'] === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.['EVENT']);

    if (status === undefined) {
      return undefined;
    }

    return {
      status: status,
      date: new Date().toISOString(),
      externalId: body.['TRANSID'],
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ? body.response : '',
      row: body,
    };
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case NetCoreStatusEnum.OPENED:
        return EmailEventStatusEnum.OPENED;
      case NetCoreStatusEnum.BOUNCED:
        return EmailEventStatusEnum.BOUNCED;
      case NetCoreStatusEnum.CLICKED:
        return EmailEventStatusEnum.CLICKED;
      case NetCoreStatusEnum.SENT:
        return EmailEventStatusEnum.SENT;
      case NetCoreStatusEnum.SPAM:
        return EmailEventStatusEnum.SPAM;
      case NetCoreStatusEnum.UNSUBSCRIBED:
        return EmailEventStatusEnum.UNSUBSCRIBED;
      case NetCoreStatusEnum.DROPPED:
        return EmailEventStatusEnum.DROPPED;
      case NetCoreStatusEnum.INVALID:
        return EmailEventStatusEnum.INVALID;
    }
  }
}
