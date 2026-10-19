import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  IAttachmentOptions,
  ICheckIntegrationResponse,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

const GROUNDMAIL_API_URL = 'https://api.groundmail.dev';
const MAX_TAGS = 10;

interface IGroundmailAttachment {
  name: string;
  content_type: string;
  data: string;
  content_id?: string;
}

type IGroundmailSendRequest = {
  from: string | { email: string; name?: string };
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  reply_to?: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
  attachments?: IGroundmailAttachment[];
};

interface IGroundmailErrorBody {
  error?: { message?: string; code?: string };
}

export class GroundmailEmailProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.Groundmail;
  // The Groundmail API is snake_case (reply_to, content_type); bridge keys are re-cased to match.
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  constructor(
    private config: {
      apiKey: string;
      from?: string;
      senderName?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName || this.config.senderName;
    const fromAddress = options.from || this.config.from;

    if (!fromAddress) {
      throw new Error('Groundmail requires a from address');
    }

    const headers = { ...this.correlationHeaders(options), ...options.headers };
    const tags = this.mapTags(options.customData?.tags);
    const attachments = this.mapAttachments(options.attachments);

    const mailData: IGroundmailSendRequest = {
      from: senderName ? { email: fromAddress, name: senderName } : fromAddress,
      to: options.to,
      subject: options.subject,
      ...(options.html ? { html: options.html } : {}),
      ...(options.text ? { text: options.text } : {}),
      ...(options.cc?.length ? { cc: options.cc } : {}),
      ...(options.bcc?.length ? { bcc: options.bcc } : {}),
      ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(tags.length ? { tags } : {}),
      ...(attachments?.length ? { attachments } : {}),
    };

    const { body, headers: passthroughHeaders } = this.transform<IGroundmailSendRequest>(bridgeProviderData, mailData);

    // Novu's message id doubles as the idempotency key so a retried job cannot double-send.
    const response = await fetch(`${GROUNDMAIL_API_URL}/emails`, {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        'Content-Type': 'application/json',
        ...(options.id ? { 'Idempotency-Key': options.id } : {}),
        ...passthroughHeaders,
      },
      body: JSON.stringify(body),
    });

    const payload = await this.readJson(response);

    if (!response.ok) {
      throw new Error(this.errorMessage(response.status, payload as IGroundmailErrorBody));
    }

    return {
      id: (payload as { id?: string }).id,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(_options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    try {
      // A cheap authenticated read; validates the API key without sending a probe email.
      const response = await fetch(`${GROUNDMAIL_API_URL}/emails?limit=1`, {
        method: 'GET',
        headers: this.authHeaders(),
      });
      const payload = (await this.readJson(response)) as IGroundmailErrorBody;

      if (response.ok) {
        return {
          success: true,
          message: 'Integrated successfully!',
          code: CheckIntegrationResponseEnum.SUCCESS,
        };
      }

      if (response.status === 403 && payload?.error?.code === 'insufficient_scope') {
        // The key is valid; it just cannot read emails (for example a send-only key).
        return {
          success: true,
          message: 'Integrated successfully!',
          code: CheckIntegrationResponseEnum.SUCCESS,
        };
      }

      return {
        success: false,
        message: this.errorMessage(response.status, payload),
        code:
          response.status === 401 ? CheckIntegrationResponseEnum.BAD_CREDENTIALS : CheckIntegrationResponseEnum.FAILED,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error)?.message,
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.config.apiKey}` };
  }

  private async readJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  private errorMessage(status: number, payload?: IGroundmailErrorBody): string {
    return payload?.error?.message || `Groundmail request failed with status ${status}`;
  }

  private mapAttachments(attachments?: IAttachmentOptions[]): IGroundmailAttachment[] | undefined {
    return attachments
      ?.filter((attachment) => attachment.file)
      .map((attachment) => ({
        name: attachment.name ?? 'attachment',
        content_type: attachment.mime || 'application/octet-stream',
        data: Buffer.from(attachment.file).toString('base64'),
        ...(attachment.cid ? { content_id: attachment.cid } : {}),
      }));
  }

  // Optional `customData.tags`: either { name: value } or [{ name, value }].
  private mapTags(raw: unknown): { name: string; value: string }[] {
    let tags: { name: string; value: string }[] = [];

    if (Array.isArray(raw)) {
      tags = raw
        .filter((tag) => tag && typeof tag.name === 'string' && tag.value !== undefined)
        .map((tag) => ({ name: tag.name, value: String(tag.value) }));
    } else if (raw && typeof raw === 'object') {
      tags = Object.entries(raw as Record<string, unknown>).map(([name, value]) => ({ name, value: String(value) }));
    }

    return tags.slice(0, MAX_TAGS);
  }

  // Novu correlation ids ride as X-Novu-* headers so they appear on the stored email.
  private correlationHeaders(options: IEmailOptions): Record<string, string> {
    const details = (options.notificationDetails ?? {}) as Record<string, unknown>;
    const candidates: Record<string, unknown> = {
      'X-Novu-Transaction-Id': details.transactionId,
      'X-Novu-Message-Id': options.id,
    };

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(candidates)) {
      if (typeof value === 'string' && value.length > 0) {
        headers[key] = value;
      }
    }

    return headers;
  }
}
