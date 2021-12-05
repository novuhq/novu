import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';
import { Message } from 'emailjs';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { SESConfig } from './ses.config';

export class SESEmailProvider implements IEmailProvider {
  id = 'ses';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly ses: SESClient;

  constructor(private readonly config: SESConfig) {
    this.ses = new SESClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async sendMessage({
    html,
    text,
    to,
    from,
    subject,
    attachments,
  }: IEmailOptions): Promise<ISendMessageSuccessResponse> {
    const message = new Message({
      from: from || this.config.from,
      to,
      text,
      subject,
      attachment: [
        { data: html, alternative: true },
        ...attachments?.map((attachment) => ({
          name: attachment?.name,
          data: attachment.file.toString(),
          type: attachment.mime,
        })),
      ],
    });

    const rawMessage = await message.readAsync();
    const command = new SendRawEmailCommand({
      RawMessage: {
        Data: new Uint8Array(Buffer.from(rawMessage, 'utf8')),
      },
    });
    const result = await this.ses.send(command);

    return {
      id: result?.MessageId,
      date: new Date().toISOString(),
    };
  }
}
