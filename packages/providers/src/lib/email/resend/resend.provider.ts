import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  EmailEventStatusEnum,
  ICheckIntegrationResponse,
  IEmailEventBody,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  IVerifyCredentialsResponse,
  VerifyCredentialsStatusEnum,
} from '@novu/stateless';
import { CreateEmailOptions, Resend } from 'resend';
import { Webhook } from 'svix';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { verifyCredentialsResponse } from '../../../utils/verify-credentials';

export type EmailSentWebhook = {
  type:
    | 'email.sent'
    | 'email.failed'
    | 'email.delivered'
    | 'email.delivery_delayed'
    | 'email.bounced'
    | 'email.opened'
    | 'email.clicked'
    | 'email.complained'
    | 'email.scheduled';
  created_at: string;
  data: {
    created_at: string;
    email_id: string;
    from: string;
    subject: string;
    to: string[];
  };
};

interface ResendErrorResponse {
  statusCode: number;
  error: string;
  name: string;
}

interface ResendSuccessResponse {
  data: { id: string };
  error: null;
}

interface ResendResponseWithError {
  data: null;
  error: ResendErrorResponse;
}

type ResendResponse = ResendSuccessResponse | ResendResponseWithError;

/**
 * Validate (type-guard) that an error response matches our ResendErrorResponse interface.
 * this is needed because of this issue https://github.com/resend/resend-node/issues/538
 */
function isResendError(response: ResendResponse | unknown): response is ResendResponseWithError {
  return (
    response !== null &&
    typeof response === 'object' &&
    'error' in response &&
    response.error !== null &&
    typeof response.error === 'object' &&
    'error' in response.error &&
    typeof response.error.error === 'string'
  );
}

type ResendApiError = { name?: string; message?: string; statusCode?: number | null };

/** Resend answers an unknown key with `invalid_api_key`, or with a `validation_error` that says so. */
function isRejectedResendKey(error: ResendApiError): boolean {
  return (
    error.name === 'invalid_api_key' ||
    error.name === 'missing_api_key' ||
    /api key is invalid/i.test(error.message ?? '')
  );
}

/**
 * Reads the outcome of a read-only Resend call. The SDK never throws: a refusal comes back as `error`.
 * - `restricted_api_key` means Resend knows the key and it is limited to sending, which is all Novu needs.
 * - `application_error` is the SDK's own name for a request that got no usable answer.
 */
function classifyResendVerification(error: ResendApiError | null | undefined): VerifyCredentialsStatusEnum {
  if (!error) return VerifyCredentialsStatusEnum.VALID;
  if (error.name === 'restricted_api_key') return VerifyCredentialsStatusEnum.VALID;
  if (isRejectedResendKey(error)) return VerifyCredentialsStatusEnum.INVALID;

  const statusCode = error.statusCode ?? undefined;
  if (
    error.name === 'application_error' ||
    error.name === 'internal_server_error' ||
    error.name === 'rate_limit_exceeded' ||
    statusCode === 429 ||
    (statusCode !== undefined && statusCode >= 500)
  ) {
    return VerifyCredentialsStatusEnum.UNREACHABLE;
  }

  return VerifyCredentialsStatusEnum.INCONCLUSIVE;
}

export class ResendEmailProvider extends BaseProvider implements IEmailProvider {
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  id = EmailProviderIdEnum.Resend;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private resendClient: Resend;

  constructor(
    private config: {
      apiKey: string;
      from: string;
      senderName?: string;
      webhookSigningKey?: string;
    }
  ) {
    super();
    this.resendClient = new Resend(this.config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName || this.config?.senderName;
    const fromAddress = options.from || this.config.from;

    const response = await this.resendClient.emails.send(
      this.transform<CreateEmailOptions>(bridgeProviderData, {
        from: senderName ? `${senderName} <${fromAddress}>` : fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc,
        replyTo: options.replyTo || null,
        attachments: options.attachments?.map((attachment) => ({
          filename: attachment?.name,
          content: attachment.file,
          contentId: attachment.cid,
        })),
        bcc: options.bcc,
        headers: options.headers,
      } satisfies CreateEmailOptions).body
    );

    if (isResendError(response)) {
      throw new Error(response.error.error);
    } else if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      id: response.data?.id,
      date: new Date().toISOString(),
    };
  }

  /** Lists the domains: a read-only call that tells a known key from an unknown one without sending an email. */
  async verifyCredentials(): Promise<IVerifyCredentialsResponse> {
    try {
      const { error } = await this.resendClient.domains.list();

      return verifyCredentialsResponse(classifyResendVerification(error));
    } catch {
      return verifyCredentialsResponse(VerifyCredentialsStatusEnum.UNREACHABLE);
    }
  }

  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    try {
      // The SDK returns a refusal as `error` instead of throwing, so the response has to be read.
      const response = await this.resendClient.emails.send({
        from: options.from || this.config.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc,
        attachments: options.attachments?.map((attachment) => ({
          filename: attachment?.name,
          content: attachment.file,
          contentId: attachment.cid,
        })),
        bcc: options.bcc,
      });

      if (response.error) {
        return {
          success: false,
          message: response.error.message,
          code: isRejectedResendKey(response.error)
            ? CheckIntegrationResponseEnum.BAD_CREDENTIALS
            : CheckIntegrationResponseEnum.FAILED,
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

  getMessageId(body: EmailSentWebhook): string[] {
    return [body.data.email_id];
  }

  parseEventBody(body: EmailSentWebhook): IEmailEventBody | undefined {
    return {
      status: this.getStatus(body.type),
      date: new Date().toISOString(),
      externalId: body.data.email_id,
      row: JSON.stringify(body),
    };
  }

  private getStatus(event: EmailSentWebhook['type']): EmailEventStatusEnum | undefined {
    switch (event) {
      case 'email.sent':
        return EmailEventStatusEnum.SENT;
      case 'email.failed':
        return EmailEventStatusEnum.REJECTED;
      case 'email.delivered':
        return EmailEventStatusEnum.DELIVERED;
      case 'email.delivery_delayed':
        return EmailEventStatusEnum.DELAYED;
      case 'email.bounced':
        return EmailEventStatusEnum.BOUNCED;
      case 'email.opened':
        return EmailEventStatusEnum.OPENED;
      case 'email.clicked':
        return EmailEventStatusEnum.CLICKED;
      case 'email.complained':
        return EmailEventStatusEnum.COMPLAINT;
      default:
        return undefined;
    }
  }

  async verifySignature({
    rawBody,
    headers = {},
    body: _body,
  }: {
    // biome-ignore lint/suspicious/noExplicitAny: pre-existing; mirrors the untyped provider webhook body contract
    rawBody: any;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const svixId = this.getHeaderValue(headers, 'svix-id');
      const svixTimestamp = this.getHeaderValue(headers, 'svix-timestamp');
      const svixSignature = this.getHeaderValue(headers, 'svix-signature');

      const webhookSigningKey = this.config.webhookSigningKey;

      if (!webhookSigningKey) {
        return {
          success: true,
          message: 'Resend signature verification is not configured',
        };
      }

      if (rawBody === undefined) {
        return { success: false, message: 'Body is undefined' };
      }

      const webhook = new Webhook(webhookSigningKey);
      const svixHeaders = {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      };

      webhook.verify(rawBody, svixHeaders);

      return { success: true, message: 'Resend signature verification successful' };
    } catch (error) {
      return { success: false, message: `Error verifying signature: ${error.message}` };
    }
  }

  private getHeaderValue(headers: Record<string, string>, headerName: string): string | undefined {
    // Case-insensitive header lookup
    const lowerHeaderName = headerName.toLowerCase();
    const key = Object.keys(headers).find((k) => k.toLowerCase() === lowerHeaderName);

    return key ? headers[key] : undefined;
  }

  async autoConfigureInboundWebhook(_configurations: { webhookUrl: string }): Promise<{
    success: boolean;
    message?: string;
    configurations?: unknown;
  }> {
    return {
      success: false,
      message:
        'Resend does not currently offer automatic inbound webhook configuration. Please configure your webhook manually.',
    };
  }
}
