import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';

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
}
