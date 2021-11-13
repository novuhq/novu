import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';
import {
  SendSmtpEmail,
  SendSmtpEmailTo,
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
} from '@sendinblue/client';

export class SendinblueEmailProvider implements IEmailProvider {
  id = 'sendinblue';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private transactionalEmailsApi: TransactionalEmailsApi;

  constructor(
    private config: {
      apiKey: string;
    }
  ) {
    this.transactionalEmailsApi = new TransactionalEmailsApi();
    this.transactionalEmailsApi.setApiKey(
      TransactionalEmailsApiApiKeys.apiKey,
      this.config.apiKey
    );
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const email = new SendSmtpEmail();
    email.sender = { email: options.from || options.from };
    email.to = getFormattedTo(options.to);
    email.subject = options.subject;
    email.htmlContent = options.html;
    email.textContent = options.text;
    email.attachment = options.attachments?.map((attachment) => ({
      name: attachment.name,
      content: attachment?.file?.toString('base64'),
      contentType: attachment.mime,
    }));

    const { response, body } =
      await this.transactionalEmailsApi.sendTransacEmail(email);

    return {
      id: body?.messageId,
      date: response?.headers?.date,
    };
  }
}

function getFormattedTo(to: string | string[]): SendSmtpEmailTo[] {
  if (typeof to === 'string') {
    return [{ email: to }];
  }
  return to.map((email: string) => ({ email }));
}
