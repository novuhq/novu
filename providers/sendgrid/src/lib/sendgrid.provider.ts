import { ChannelTypeEnum, IEmailOptions, IEmailProvider } from '@notifire/core';

import sendgridMail from '@sendgrid/mail';

export class SendgridEmailProvider implements IEmailProvider {
  id = 'sendgrid';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {
    sendgridMail.setApiKey(this.config.apiKey);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendMessage(options: IEmailOptions): Promise<any> {
    return await sendgridMail.send({
      from: options.from || this.config.from,
      to: options.to,
      html: options.html,
      subject: options.subject,
      substitutions: {},
    });
  }
}
