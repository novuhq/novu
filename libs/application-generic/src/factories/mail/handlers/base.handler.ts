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

/**
 * Their `checkIntegration` returns success without calling the provider, so it proves nothing about the
 * credentials. They stay "unsupported" until they get a real check.
 */
const EMAIL_PROVIDERS_WITHOUT_REAL_CHECK: ReadonlySet<string> = new Set([
  EmailProviderIdEnum.Sendinblue,
  EmailProviderIdEnum.Mailgun,
  EmailProviderIdEnum.EmailJS,
  EmailProviderIdEnum.NetCore,
  EmailProviderIdEnum.EmailWebhook,
]);

/**
 * Providers whose `BAD_CREDENTIALS` only means the API key was rejected. Others also use it for request errors
 * (SendGrid maps 400, Anypost includes permission errors, Mailjet returns it for every exception), so for them it
 * is treated as inconclusive and never pauses an integration.
 */
const EMAIL_PROVIDERS_WITH_RELIABLE_BAD_CREDENTIALS: ReadonlySet<string> = new Set([
  EmailProviderIdEnum.Postmark,
  EmailProviderIdEnum.MailerSend,
]);

const EMAIL_CHECK_MESSAGES = {
  valid: 'The provider accepted these credentials.',
  invalid: 'The provider rejected these credentials.',
  unreachable: "Couldn't reach the provider to check these credentials.",
  inconclusive: 'The provider returned an error, so these credentials could not be confirmed.',
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
   * existing `checkIntegration`, which sends a test email to `no-reply@novu.co`.
   * - Providers whose check never calls the provider are unsupported (`null`).
   * - `BAD_CREDENTIALS` counts as invalid only where it reliably means a rejected key; otherwise it's inconclusive.
   * - Messages are fixed strings: `checkIntegration` copies raw provider errors, which must not reach the user.
   */
  public async verifyCredentials(): Promise<IVerifyCredentialsResponse | null> {
    if (this.provider.verifyCredentials) {
      return this.provider.verifyCredentials();
    }

    if (!this.provider.checkIntegration || EMAIL_PROVIDERS_WITHOUT_REAL_CHECK.has(this.providerId)) {
      return null;
    }

    let result: Awaited<ReturnType<IEmailProvider['checkIntegration']>>;
    try {
      result = await this.provider.checkIntegration(CHECK_INTEGRATION_MAIL);
    } catch {
      return { status: VerifyCredentialsStatusEnum.UNREACHABLE, message: EMAIL_CHECK_MESSAGES.unreachable };
    }

    if (result?.success) {
      return { status: VerifyCredentialsStatusEnum.VALID, message: EMAIL_CHECK_MESSAGES.valid };
    }

    if (
      result?.code === CheckIntegrationResponseEnum.BAD_CREDENTIALS &&
      EMAIL_PROVIDERS_WITH_RELIABLE_BAD_CREDENTIALS.has(this.providerId)
    ) {
      return { status: VerifyCredentialsStatusEnum.INVALID, message: EMAIL_CHECK_MESSAGES.invalid };
    }

    return { status: VerifyCredentialsStatusEnum.INCONCLUSIVE, message: EMAIL_CHECK_MESSAGES.inconclusive };
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
