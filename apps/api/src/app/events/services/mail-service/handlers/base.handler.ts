import { IEmailOptions, IEmailProvider } from '@novu/stateless';
import { ChannelTypeEnum } from '@novu/shared';
import { IMailHandler } from '../interfaces/send.handler.interface';

export abstract class BaseHandler implements IMailHandler {
  protected provider: IEmailProvider;

  protected constructor(private providerId: string, private channelType: string) {}

  canHandle(providerId: string, channelType: ChannelTypeEnum) {
    return providerId === this.providerId && channelType === this.channelType;
  }

  abstract buildProvider(credentials, options);

  async send(mailData: IEmailOptions) {
    if (process.env.NODE_ENV === 'test') {
      return null;
    }

    return await this.provider.sendMessage(mailData);
  }

  async checkIntegration() {
    const mailData: IEmailOptions = {
      html: '<div>checking integration</div>',
      subject: 'Checking Integration',
      to: 'biswa@novu.co',
    };

    return await this.send(mailData);
  }
}
