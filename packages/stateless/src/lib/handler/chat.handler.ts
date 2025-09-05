import { HandlebarsContentEngine, IContentEngine } from '../content/content.engine';
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

    if (!data.$channelData) {
      throw new Error(
        'Channel data is missing in trigger payload. To send an a chat message you must specify a channelData property.'
      );
    }

    return await this.provider.sendMessage(
      {
        channelData: data.$channelData,
        content,
      },
      {}
    );
  }
}
