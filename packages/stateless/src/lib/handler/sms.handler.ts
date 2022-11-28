import {
  HandlebarsContentEngine,
  IContentEngine,
} from '../content/content.engine';
import { ISmsProvider } from '../provider/provider.interface';
import {
  ChannelTypeEnum,
  IMessage,
  ITriggerPayload,
} from '../template/template.interface';

export class SmsHandler {
  private readonly contentEngine: IContentEngine;

  constructor(
    private message: IMessage,
    private provider: ISmsProvider,
    contentEngine?: IContentEngine
  ) {
    this.contentEngine = contentEngine ?? new HandlebarsContentEngine();
  }

  async send(data: ITriggerPayload) {
    const attachments = data.$attachments?.filter((item) =>
      item.channels?.length
        ? item.channels?.includes(ChannelTypeEnum.SMS)
        : true
    );

    let content = '';
    if (typeof this.message.template === 'string') {
      content = this.contentEngine.compileTemplate(this.message.template, data);
    } else {
      content = await this.message.template(data);
    }

    if (!data.$phone) {
      throw new Error(
        '$phone is missing in trigger payload. To send an SMS You must specify a $phone property.'
      );
    }

    return await this.provider.sendMessage({
      to: data.$phone,
      content,
      attachments,
    });
  }
}
