import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/node';

import mailchimp from '@mailchimp/mailchimp_transactional';
import { MandrillInterface } from './mandrill.interface';

export class MandrillProvider implements IEmailProvider {
  id = 'mandrill';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private transporter: MandrillInterface;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {
    this.transporter = mailchimp(this.config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    let to = [];

    if (typeof options.to === 'string') {
      to = [
        {
          email: typeof options.to === 'string' ? options.to : options.to[0],
          type: 'to',
        },
      ];
    } else {
      to = options.to.map((item) => ({
        email: item,
        type: 'to',
      }));
    }

    const response = await this.transporter.messages.send({
      message: {
        from_email: this.config.from,
        subject: options.subject,
        html: options.html,
        to,
        attachments: options.attachments?.map((attachment) => ({
          content: attachment.file.toString(),
          type: attachment.mime,
          name: attachment?.name,
        })),
      },
    });

    return {
      id: response[0]._id,
      date: new Date().toISOString(),
    };
  }
}
