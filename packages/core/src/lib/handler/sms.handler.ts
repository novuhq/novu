import { compileTemplate } from '../content/content.engine';
import { ISmsProvider } from '../provider/provider.interface';
import { IMessage, ITriggerPayload } from '../template/template.interface';

export class SmsHandler {
  constructor(private message: IMessage, private provider: ISmsProvider) {}

  async send(data: ITriggerPayload) {
    const content = compileTemplate(this.message.template, data);

    await this.provider.sendMessage({
      to: data.$phone,
      content
    });
  }
}
