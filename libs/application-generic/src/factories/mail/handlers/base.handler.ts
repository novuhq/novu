import { EmailProviderIdEnum } from '@novu/shared';
import { IEmailOptions, IEmailProvider } from '@novu/stateless';
import { PlatformException } from '../../../utils/exceptions';
import { BaseHandler } from '../../shared/interfaces';
import { IMailHandler } from '../interfaces';

export abstract class BaseEmailHandler extends BaseHandler<IEmailProvider> implements IMailHandler {
  protected provider: IEmailProvider;

  protected constructor(providerId: EmailProviderIdEnum, channelType: string) {
    super(providerId, channelType);
  }

  abstract buildProvider(credentials, options);

  async send(mailData: IEmailOptions) {
    if (process.env.NODE_ENV === 'test') {
      return {};
    }

    const { bridgeProviderData, ...otherOptions } = mailData;

    return await this.provider.sendMessage(otherOptions, bridgeProviderData);
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

    const { message, success, code } = await this.provider.checkIntegration(mailData);

    if (!success) {
      throw new PlatformException(
        JSON.stringify({
          success,
          code,
          message: message || 'Something went wrong! Please double check your account details(Email/API key)',
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
