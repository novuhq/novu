import { AuthType, Infobip } from '@infobip-api/sdk';
import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  IVerifyCredentialsResponse,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { resolveSafeInfobipBaseUrl } from '../../../utils/safe-infobip-base-url';
import { WithPassthrough } from '../../../utils/types';
import { VERIFY_CREDENTIALS_TIMEOUT_MS, verifyCredentialsWith } from '../../../utils/verify-credentials';

export class InfobipEmailProvider extends BaseProvider implements IEmailProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  id = EmailProviderIdEnum.Infobip;

  private infobipClient;

  constructor(
    private config: {
      baseUrl: string;
      apiKey: string;
      from?: string;
    }
  ) {
    super();
    const baseUrl = resolveSafeInfobipBaseUrl(this.config.baseUrl);

    this.infobipClient = new Infobip({
      baseUrl,
      apiKey: this.config.apiKey,
      authType: AuthType.ApiKey,
    });
  }

  /** Reads the account balance, as the Infobip SMS provider does: read-only, and no email is sent. */
  async verifyCredentials(): Promise<IVerifyCredentialsResponse> {
    const baseUrl = resolveSafeInfobipBaseUrl(this.config.baseUrl).replace(/\/+$/, '');

    return verifyCredentialsWith(() =>
      createProviderHttpClient({ timeoutMs: VERIFY_CREDENTIALS_TIMEOUT_MS }).get(`${baseUrl}/account/1/balance`, {
        headers: { Authorization: `App ${this.config.apiKey}` },
      })
    );
  }

  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    try {
      // The SDK resolves with the request error instead of throwing, so the response has to be read.
      const response = await this.infobipClient.channels.email.send({
        to: options.to,
        from: this.config.from || options.from,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      if (response instanceof Error || !Array.isArray(response?.data?.messages)) {
        const httpStatus = response?.response?.status;

        return {
          success: false,
          message: 'Infobip did not accept the request',
          code: httpStatus === 401 ? CheckIntegrationResponseEnum.BAD_CREDENTIALS : CheckIntegrationResponseEnum.FAILED,
        };
      }

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message,
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const infobipResponse = await this.infobipClient.channels.email.send(
      this.transform(bridgeProviderData, {
        to: options.to,
        from: options.from || this.config.from,
        subject: options.subject,
        text: options.text,
        html: options.html,
      }).body
    );
    const { messageId } = infobipResponse.data.messages.pop();

    return {
      id: messageId,
      date: new Date().toISOString(),
    };
  }
}
