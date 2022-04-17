import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
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
}

const getFormattedTo = (to: string | string[]): string => {
  if (Array.isArray(to)) return to.join(', ');
  return to;
};
