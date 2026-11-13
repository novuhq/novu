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
import { providerFetch } from '../../../utils/http';
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

    // Bridge `headers` skip the snake_case conversion below: header names are sent exactly as given.
    const { headers: bridgeHeaders, ...bridgeData } = bridgeProviderData;
    const headers = {
      ...this.correlationHeaders(options),
      ...options.headers,
      ...this.stringRecord(bridgeHeaders),
    };
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

    const { body, headers: passthroughHeaders } = this.transform<IGroundmailSendRequest>(bridgeData, mailData);
    const idempotencyKey = this.idempotencyKey(options);

    const response = await providerFetch(`${GROUNDMAIL_API_URL}/emails`, {
      method: 'POST',
      headers: {
        ...this.authHeaders(),
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
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
      const response = await providerFetch(`${GROUNDMAIL_API_URL}/emails?limit=1`, {
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

  /*
   * The Novu job id is the same on every attempt of one job, and each job is one step for one
   * subscriber, so a retried job replays the original send instead of sending again. The message
   * id cannot be used: the worker creates a new message, with a new id, on every attempt.
   * Callers outside the worker that set no job id fall back to their own `id`.
   */
  private idempotencyKey(options: IEmailOptions): string | undefined {
    const jobId = (options.notificationDetails as Record<string, unknown> | undefined)?.jobId;

    if (typeof jobId === 'string' && jobId.length > 0) {
      return `novu-job-${jobId}`;
    }

    return options.id || undefined;
  }

  /*
   * Novu correlation ids ride as X-Novu-* headers so they appear on the stored email. Only ids
   * that stay the same across retries belong here: Groundmail replays an idempotent request
   * only when the body matches the original.
   */
  private correlationHeaders(options: IEmailOptions): Record<string, string> {
    const details = (options.notificationDetails ?? {}) as Record<string, unknown>;

    return this.stringRecord({
      'X-Novu-Transaction-Id': details.transactionId,
      'X-Novu-Job-Id': details.jobId,
    });
  }

  private stringRecord(raw: unknown): Record<string, string> {
    const record: Record<string, string> = {};

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return record;
    }

    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'string' && value.length > 0) {
        record[key] = value;
      }
    }

    return record;
  }
}
