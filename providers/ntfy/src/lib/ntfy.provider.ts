import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';

export class NtfyPushProvider implements IPushProvider {
  id = 'ntfy';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  constructor(
    private config: {
      topic: string;
    }
  ) {
    this.config = config;
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const response = await fetch('https://ntfy.sh', {
      method: 'POST',
      body: JSON.stringify({
        topic: options.topic,
        message: options.message,
        title: options.title,
      }),
      headers: {
        Title: options.title,
      },
    });

    const data = await response.json();

    return {
      id: data.id,
      date: new Date().toISOString(),
    };
  }
}
