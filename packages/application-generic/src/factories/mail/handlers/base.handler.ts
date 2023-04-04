import { IEmailOptions, IEmailProvider } from '@novu/stateless';
import { ChannelTypeEnum } from '@novu/shared';

import { IMailHandler } from '../interfaces/send.handler.interface';
import { PlatformException } from '../../../utils/exceptions';

export abstract class BaseHandler implements IMailHandler {
  protected provider: IEmailProvider;

  protected constructor(
    private providerId: string,
    private channelType: string
  ) {}

  canHandle(providerId: string, channelType: ChannelTypeEnum) {
    return providerId === this.providerId && channelType === this.channelType;
  }

  abstract buildProvider(credentials, options);

  async send(mailData: IEmailOptions) {
    if (process.env.NODE_ENV === 'test') {
      return {};
    }

    return await this.provider.sendMessage(mailData);
  }

  public getProvider(): IEmailProvider {
    return this.provider;
  }

  async check() {
    const mailData: IEmailOptions = {
      html: '<div>checking integration</div>',
      subject: 'Checking Integration',
      to: ['no-reply@novu.co'],
    };

    const { message, success, code } = await this.provider.checkIntegration(
      mailData
    );

    if (!success) {
      throw new PlatformException(
        JSON.stringify({
          success,
          code,
          message:
            message ||
            'Something went wrong! Please double check your account details(Email/API key)',
        })
      );
    }

    return {
      success,
      code,
      message: 'Integration successful',
    };
  }
}
