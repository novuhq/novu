import { HandlebarsContentEngine, IContentEngine } from '../content/content.engine';
import { ChannelData, ENDPOINT_TYPES } from '../provider/channel-data.type';
import { IChatProvider } from '../provider/provider.interface';
import { IMessage, ITriggerPayload } from '../template/template.interface';

export class ChatHandler {
  private readonly contentEngine: IContentEngine;

  constructor(
    private message: IMessage,
    private provider: IChatProvider,
    contentEngine?: IContentEngine
  ) {
    this.contentEngine = contentEngine ?? new HandlebarsContentEngine();
  }

  async send(data: ITriggerPayload) {
    let content = '';
    if (typeof this.message.template === 'string') {
      content = this.contentEngine.compileTemplate(this.message.template, data);
    } else {
      content = await this.message.template(data);
    }

    const channelData = this.getChannelData(data);

    return await this.provider.sendMessage(
      {
        channelData,
        content,
      },
      {}
    );
  }

  private getChannelData(data: ITriggerPayload): ChannelData {
    // If channelData is provided, use it directly (new format)
    if (data.$channelData) {
      return data.$channelData;
    }

    // If webhookUrl is provided, transform it to channelData format (legacy support)
    if (data.$webhookUrl) {
      return {
        type: ENDPOINT_TYPES.WEBHOOK,
        endpoint: {
          url: data.$webhookUrl,
          ...(data.$channel_id && { channel: data.$channel_id as string }),
        },
        identifier: '-',
      };
    }

    // Neither channelData nor webhookUrl provided
    throw new Error(
      'Channel data is missing in trigger payload. To send a chat message you must specify either a channelData property or a webhookUrl property.'
    );
  }
}
