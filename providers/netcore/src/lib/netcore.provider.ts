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
  INVALID = 'invalid',
  DROPPED = 'drop',
  CLICKED = 'click',
  SPAM = 'spam',
  UNSUBSCRIBED = 'unsub',
}

export class NetCoreProvider implements IEmailProvider {
  id = 'netcore';

  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {}

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const netcoreLib = await import('pepipost/lib');

    netcoreLib.Configuration.apiKey = this.config.apiKey;

    const controller = netcoreLib.MailSendController;
    const body = new netcoreLib.Send();

    body.from = new netcoreLib.From();
    body.from.email = options.from || this.config.from;
    body.subject = options.subject;

    body.content = [];
    body.content[0] = new netcoreLib.Content();
    body.content[0].type = netcoreLib.TypeEnum.HTML;
    body.content[0].value = options.html;

    body.personalizations = [];
    body.personalizations[0] = new netcoreLib.Personalizations();
    body.personalizations[0].to = options.to.map((email) => {
      const item = new netcoreLib.EmailStruct();
      item.email = email;

      return item;
    });

    if (options.cc) {
      body.personalizations[0].cc = options.cc.map((ccItem, index) => {
        const email = new netcoreLib.EmailStruct();
        email.email = ccItem;

        return email;
      });
    }

    if (options.bcc) {
      body.personalizations[0].bcc = options.bcc.map((ccItem, index) => {
        const email = new netcoreLib.EmailStruct();
        email.email = ccItem;

        return email;
      });
    }

    body.personalizations[0].attachments = options.attachments?.map(
      (attachment) => {
        const attachmentPayload = new netcoreLib.Attachments();
        attachmentPayload.content = attachment.file.toString('base64');
        attachmentPayload.filename = attachment.name;

        return attachment;
      }
    );

    const response = await controller.createGeneratethemailsendrequest(body);

    return {
      id: response?.data?.TRANSID,
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
      return body.map((item) => item.TRANSID);
    }

    return [body.TRANSID];
  }

  parseEventBody(
    body: any | any[],
    identifier: string
  ): IEmailEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => item.TRANSID === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.EVENT);

    if (status === undefined) {
      return undefined;
    }

    return {
      status: status,
      date: new Date(body.TIMESTAMP).toISOString(),
      externalId: body.TRANSID,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.response ?? '',
      row: body,
    };
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case NetCoreStatusEnum.OPENED:
        return EmailEventStatusEnum.OPENED;
      case NetCoreStatusEnum.INVALID:
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
    }
  }
}
