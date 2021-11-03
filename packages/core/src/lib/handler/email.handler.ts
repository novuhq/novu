import { compileTemplate } from '../content/content.engine';
import { IEmailProvider } from '../provider/provider.interface';
import { IMessage, ITriggerPayload } from '../template/template.interface';
import { ITheme } from '../theme/theme.interface';

export class EmailHandler {
  constructor(
    private message: IMessage,
    private provider: IEmailProvider,
    private theme?: ITheme
  ) {}

  async send(data: ITriggerPayload) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branding: any = data?.$branding || {};

    const templatePayload = {
      $branding: branding,
      ...data,
    };

    let html = '';

    if (typeof this.message.template === 'string') {
      html = compileTemplate(this.message.template, templatePayload);
    } else {
      html = await this.message.template(templatePayload);
    }
    const subject = compileTemplate(this.message.subject || '', data);

    if (this.theme?.emailTemplate?.getEmailLayout()) {
      const themeVariables =
        this.theme?.emailTemplate?.getTemplateVariables() || {};

      html = compileTemplate(this.theme?.emailTemplate?.getEmailLayout(), {
        ...templatePayload,
        ...themeVariables,
        body: html,
      });
    }

    if (!data.$email) {
      throw new Error(
        '$email on the trigger payload is missing. To send an email, you must provider it.'
      );
    }

    await this.provider.sendMessage({
      to: data.$email,
      subject,
      html,
    });
  }
}
