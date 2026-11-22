import { EmailProviderIdEnum } from '@novu/shared';
import {
  CheckIntegrationResponseEnum,
  IEmailEventBody,
  IEmailOptions,
  IEmailProvider,
  IVerifyCredentialsResponse,
  VerifyCredentialsStatusEnum,
} from '@novu/stateless';
import { PlatformException } from '../../../utils/exceptions';
import { BaseHandler } from '../../shared/interfaces';
import { IMailHandler } from '../interfaces';

const CHECK_INTEGRATION_MAIL: IEmailOptions = {
  html: '<div>checking integration</div>',
  subject: 'Checking Integration',
  to: ['no-reply@novu.co'],
};

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

  // biome-ignore lint/suspicious/noExplicitAny: pre-existing; mirrors the untyped provider webhook body contract
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
    // biome-ignore lint/suspicious/noExplicitAny: pre-existing; mirrors the untyped provider webhook body contract
    rawBody: any;
    // biome-ignore lint/suspicious/noExplicitAny: pre-existing; mirrors the untyped provider webhook body contract
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

  // biome-ignore lint/suspicious/noExplicitAny: pre-existing; mirrors the untyped provider webhook body contract
  public parseEventBody(body: any, identifier: string, eventIndex?: number): IEmailEventBody | undefined {
    if (!this.provider.parseEventBody) {
      return undefined;
    }

    return this.provider.parseEventBody(body, identifier, eventIndex);
  }

  /**
   * Prefers the provider's read-only `verifyCredentials`. Until an email provider has one, falls back to the
   * existing `checkIntegration`, which sends a test email to `no-reply@novu.co`. Only an explicit
   * `BAD_CREDENTIALS` counts as invalid; any other failure is inconclusive, so it never pauses an integration.
   */
  public async verifyCredentials(): Promise<IVerifyCredentialsResponse | null> {
    if (this.provider.verifyCredentials) {
      return this.provider.verifyCredentials();
    }

    if (!this.provider.checkIntegration) {
      return null;
    }

    let result: Awaited<ReturnType<IEmailProvider['checkIntegration']>>;
    try {
      result = await this.provider.checkIntegration(CHECK_INTEGRATION_MAIL);
    } catch {
      return {
        status: VerifyCredentialsStatusEnum.UNREACHABLE,
        message: "Couldn't reach the provider to check these credentials.",
      };
    }

    if (result?.success) {
      return { status: VerifyCredentialsStatusEnum.VALID, message: 'The provider accepted these credentials.' };
    }

    if (result?.code === CheckIntegrationResponseEnum.BAD_CREDENTIALS) {
      return { status: VerifyCredentialsStatusEnum.INVALID, message: 'The provider rejected these credentials.' };
    }

    return {
      status: VerifyCredentialsStatusEnum.INCONCLUSIVE,
      message: result?.message || 'The provider returned an error, so these credentials could not be confirmed.',
    };
  }

  async check() {
    const { message, success, code } = await this.provider.checkIntegration(CHECK_INTEGRATION_MAIL);

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
