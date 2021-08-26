import sendgridMail from '@sendgrid/mail';

import { IEmailProvider } from '../lib/provider/provider.interface';
import {
  ChannelTypeEnum,
  ITriggerPayload,
} from '../lib/template/template.interface';

export class SendgridProvider implements IEmailProvider {
  id = 'sendgrid';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      apiKey: string;
    }
  ) {
    sendgridMail.setApiKey(this.config.apiKey);
  }

  async sendMessage(
    to: string,
    subject: string,
    html: string,
    attributes: ITriggerPayload
  ): Promise<any> {
    return await sendgridMail.send({
      from: 'dima@notifire.co',
      to: to,
      html: html,
      subject: subject,
      substitutions: attributes as { [key: string]: string },
    });
  }
}
