import { compileTemplate } from '../content/content.engine';
import { IEmailProvider } from '../provider/provider.interface';
import { IMessage, ITriggerPayload } from '../template/template.interface';

export class EmailHandler {
  constructor(private message: IMessage, private provider: IEmailProvider) {
  }

  async send(data: ITriggerPayload) {
    const html = compileTemplate(this.message.template, data);
    const subject = compileTemplate(this.message.subject || '', data);

    await this.provider.sendMessage({
      to: data.$email,
      subject,
      html
    });
  }
}
