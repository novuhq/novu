import { compileTemplate } from '../content/content.engine';
import { IDirectProvider } from '../provider/provider.interface';
import { IMessage, ITriggerPayload } from '../template/template.interface';

export class DirectHandler {
  constructor(private message: IMessage, private provider: IDirectProvider) {}

  async send(data: ITriggerPayload) {
    let content = '';
    if (typeof this.message.template === 'string') {
      content = compileTemplate(this.message.template, data);
    } else {
      content = await this.message.template(data);
    }

    if (!data.$channel_id) {
      throw new Error(
        '$channel_id is missing in trigger payload. To send an SMS You must specify a $phone property.'
      );
    }

    return await this.provider.sendMessage({
      channelId: data.$channel_id,
      content,
    });
  }
}
