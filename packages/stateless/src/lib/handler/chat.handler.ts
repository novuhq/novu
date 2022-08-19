import { compileTemplate } from '../content/content.engine';
import { IChatProvider } from '../provider/provider.interface';
import { IMessage, ITriggerPayload } from '../template/template.interface';

export class ChatHandler {
  constructor(private message: IMessage, private provider: IChatProvider) {}

  async send(data: ITriggerPayload) {
    let content = '';
    if (typeof this.message.template === 'string') {
      content = compileTemplate(this.message.template, data);
    } else {
      content = await this.message.template(data);
    }

    if (!data.$wehookUrl) {
      throw new Error(
        'webhookUrl is missing in trigger payload. To send an a chat message you must specify a webhookUrl property.'
      );
    }

    return await this.provider.sendMessage({
      webhookUrl: data.$webhookUrl as string,
      content,
    });
  }
}
