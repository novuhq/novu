import { EmailProviderIdEnum } from '@novu/shared';
import { IEmailEventBody, IEmailOptions, IEmailProvider } from '@novu/stateless';
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

  public inboundWebhookEnabled(): boolean {
    return !!(this.provider.getMessageId && this.provider.parseEventBody);
  }

  public getMessageId(body: any): string[] {
    if (!this.provider.getMessageId) {
      return [];
    }

    return this.provider.getMessageId(body);
  }

  async verifySignature({
    body,
    headers,
    rawBody,
  }: {
    rawBody: any;
    body: any;
    headers: Record<string, string>;
  }): Promise<{
    success: boolean;
    message?: string;
  }> {
    if (!this.provider.verifySignature) {
      // in case verifySignature is not implemented, we return true
      return { success: true };
    }

    return this.provider.verifySignature({ body, headers, rawBody });
  }

  public parseEventBody(body: any, identifier: string): IEmailEventBody | undefined {
    if (!this.provider.parseEventBody) {
      return undefined;
    }

    return this.provider.parseEventBody(body, identifier);
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
