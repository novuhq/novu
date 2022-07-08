import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import * as lib from 'pepipost/lib';

export class NetCoreProvider implements IEmailProvider {
  id = 'netcore';

  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(apiKey: string) {
    lib.Configuration.apiKey = apiKey;
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const controller = lib.MailSendController;
    const body = new lib.Send();

    body.from = new lib.From();
    body.from.email = options.from;
    body.subject = options.subject;

    body.content = [];
    body.content[0] = new lib.Content();
    body.content[0].type = lib.TypeEnum.HTML;
    body.content[0].value = options.html;

    body.personalizations = [];
    body.personalizations[0] = new lib.Personalizations();
    body.personalizations[0].to = [];
    body.personalizations[0].to[0] = new lib.EmailStruct();
    body.personalizations[0].to[0].email = options.to;

    const response = await controller.createGeneratethemailsendrequest(body);

    return {
      id: response?.data?.message_id,
      date: new Date().toISOString(),
    };
  }
}
