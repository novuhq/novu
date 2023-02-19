import {
  HandlebarsContentEngine,
  IContentEngine,
} from '../content/content.engine';
import { IEmailProvider } from '../provider/provider.interface';
import {
  ChannelTypeEnum,
  IMessage,
  ITriggerPayload,
} from '../template/template.interface';
import { ITheme } from '../theme/theme.interface';

export class EmailHandler {
  private readonly contentEngine: IContentEngine;

  constructor(
    private message: IMessage,
    private provider: IEmailProvider,
    private theme?: ITheme,
    contentEngine?: IContentEngine
  ) {
    this.contentEngine = contentEngine ?? new HandlebarsContentEngine();
  }

  async send(data: ITriggerPayload) {
    const attachments = data.$attachments?.filter((item) =>
      item.channels?.length
        ? item.channels?.includes(ChannelTypeEnum.EMAIL)
        : true
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branding: any = data?.$branding || {};

    const templatePayload = {
      $branding: branding,
      ...data,
    };

    let html = '';

    if (typeof this.message.template === 'string') {
      html = this.contentEngine.compileTemplate(
        this.message.template,
        templatePayload
      );
    } else {
      html = this.contentEngine.compileTemplate(
        await this.message.template(templatePayload),
        templatePayload
      );
    }

    let text = '';

    if (typeof this.message.textTemplate === 'string') {
      text = this.contentEngine.compileTemplate(
        this.message.textTemplate,
        templatePayload
      );
    } else if (typeof this.message.textTemplate === 'function') {
      text = this.contentEngine.compileTemplate(
        await this.message.textTemplate(templatePayload),
        templatePayload
      );
    }

    let subjectParsed;

    if (typeof this.message.subject === 'string') {
      subjectParsed = this.message.subject || '';
    } else if (typeof this.message.subject === 'function') {
      subjectParsed = this.message.subject(data);
    } else {
      throw new Error(
        `Subject must be either of 'string' or 'function' type. Type ${typeof this
          .message.subject} passed`
      );
    }

    const subject = this.contentEngine.compileTemplate(subjectParsed, data);

    if (this.theme?.emailTemplate?.getEmailLayout()) {
      const themeVariables =
        this.theme?.emailTemplate?.getTemplateVariables() || {};

      html = this.contentEngine.compileTemplate(
        this.theme?.emailTemplate?.getEmailLayout(),
        {
          ...templatePayload,
          ...themeVariables,
          body: html,
        }
      );
    }

    if (!data.$email) {
      throw new Error(
        '$email on the trigger payload is missing. To send an email, you must provider it.'
      );
    }

    return await this.provider.sendMessage({
      to: [data.$email],
      subject,
      html,
      attachments,
      text,
    });
  }
}
