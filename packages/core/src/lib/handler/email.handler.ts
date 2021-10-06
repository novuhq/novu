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
    const branding: any = data?.$branding || {};

    const templateVariables = this.theme?.emailTemplate?.getTemplateVariables() || {};

    const templatePayload = {
      $branding: branding,
      ...data,
    };

    let html = compileTemplate(this.message.template, templatePayload);
    const subject = compileTemplate(this.message.subject || '', data);

    if (this.theme?.emailTemplate?.getEmailLayout()) {
      html = compileTemplate(this.theme?.emailTemplate?.getEmailLayout(), {
        ...templatePayload,
        ...templateVariables,
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
