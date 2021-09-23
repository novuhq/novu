import { compileTemplate } from '../content/content.engine';
import { IEmailProvider } from '../provider/provider.interface';
import { IMessage, ITriggerPayload } from '../template/template.interface';
import { ITheme } from '../theme/theme.interface';

export class EmailHandler {
  constructor(
    private message: IMessage,
    private provider: IEmailProvider,
    private theme: ITheme
  ) {}

  async send(data: ITriggerPayload) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let branding: any = {};

    if (this.theme?.branding) {
      branding = this.theme?.branding;
    }

    const templatePayload = {
      $branding: branding,
      ...data,
    };

    let html = compileTemplate(this.message.template, templatePayload);
    const subject = compileTemplate(this.message.subject || '', data);

    if (this.theme?.email?.layout) {
      html = compileTemplate(this.theme.email.layout, {
        ...templatePayload,
        body: html,
      });
    }

    await this.provider.sendMessage({
      to: data.$email,
      subject,
      html,
    });
  }
}
