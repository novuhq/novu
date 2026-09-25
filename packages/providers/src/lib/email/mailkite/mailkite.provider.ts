import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

const MAILKITE_API_URL = 'https://api.mailkite.dev';

interface MailKiteSendResponse {
  id: string;
  status: string;
}

/**
 * MailKite email provider.
 *
 * MailKite is an inbound-first email platform: receive email as a signed
 * webhook, send with one API. This provider wires the transactional send path
 * straight to the MailKite REST API (`POST /v1/send`), authenticating with a
 * Bearer API key. No SDK dependency — just the globally available `fetch`.
 *
 * @see https://mailkite.dev/docs
 */
export class MailKiteEmailProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.Mailkite;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      apiKey: string;
      from?: string;
      senderName?: string;
      baseUrl?: string;
    }
  ) {
    super();
  }

  private get baseUrl(): string {
    return this.config.baseUrl || MAILKITE_API_URL;
  }

  /**
   * MailKite reports failures as `{ "error": "from required" }`. Surface that
   * message rather than the bare status text, so an integration check or a
   * failed send tells the user what to actually fix.
   */
  private async readError(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { error?: string };

      return payload?.error || response.statusText;
    } catch {
      return response.statusText;
    }
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName || this.config?.senderName;
    const fromAddress = options.from || this.config.from;

    const { body, headers } = this.transform<Record<string, unknown>>(bridgeProviderData, {
      from: senderName ? `${senderName} <${fromAddress}>` : fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      headers: options.headers,
      attachments: options.attachments?.map((attachment) => ({
        filename: attachment?.name,
        content: attachment.file?.toString('base64'),
        contentType: attachment.mime,
      })),
    });

    const response = await fetch(`${this.baseUrl}/v1/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`MailKite send failed: ${response.status} ${await this.readError(response)}`);
    }

    const data = (await response.json()) as MailKiteSendResponse;

    return {
      id: data.id,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(_options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    try {
      // `GET /v1/me` authenticates the API key without sending any email — a
      // clean, zero-cost integration check.
      const response = await fetch(`${this.baseUrl}/v1/me`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`MailKite authentication failed: ${response.status} ${await this.readError(response)}`);
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
}
