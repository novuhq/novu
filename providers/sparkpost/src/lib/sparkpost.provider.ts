import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
} from '@novu/stateless';
import { randomUUID } from 'crypto';
import SparkPost from 'sparkpost';

export class SparkPostEmailProvider implements IEmailProvider {
  readonly id = 'sparkpost';
  readonly channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly client: SparkPost;

  constructor(apiKey: string, eu: boolean) {
    this.client = new SparkPost(apiKey, {
      endpoint: eu ? 'https://api.eu.sparkpost.com:443' : undefined,
    });
  }

  async sendMessage({
    from,
    to,
    subject,
    text,
    html,
    attachments,
  }: IEmailOptions): Promise<ISendMessageSuccessResponse> {
    let recipients: { address: string }[];
    if (typeof to === 'string') {
      recipients = [{ address: to }];
    } else {
      recipients = [];
      to.forEach((recipient) => {
        recipients.push({ address: recipient });
      });
    }

    const files: Array<{ name: string; type: string; data: string }> = [];

    attachments.forEach((attachment) => {
      files.push({
        name: attachment.name || randomUUID(),
        type: attachment.mime,
        data: attachment.file.toString('base64'),
      });
    });

    const sent = await this.client.transmissions.send({
      recipients,
      content: {
        from,
        subject,
        text,
        html,
        attachments: files,
      },
    });

    return {
      id: sent.results.id,
    };
  }
}
