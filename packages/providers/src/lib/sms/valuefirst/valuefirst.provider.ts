import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISMSEventBody,
  ISmsOptions,
  ISmsProvider,
  SmsEventStatusEnum,
} from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

interface DLT {
  entityId?: string;
  dltTemplateId?: string;
  dltContentType?: string;
  templateInfo?: string;
  headerId?: string;
}

export class ValueFirstSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.ValueFirst;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;

  private readonly TOKEN_URL = 'https://api.myvfirst.com/psms/api/messages/token?action=generate';
  private readonly BASE_URL = 'https://api.myvfirst.com/psms/servlet/psms.Eservice2';
  private static tokenCache = new Map<string, { token: string; expiry: number }>();

  constructor(
    private config: {
      user: string;
      password: string;
      from: string;
    }
  ) {
    super();
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    const refreshBuffer = 15 * 60 * 1000;
    const cacheKey = `${this.config.user}\0${this.config.password}`;
    const cached = ValueFirstSmsProvider.tokenCache.get(cacheKey);

    if (cached && now < cached.expiry - refreshBuffer) {
      return cached.token;
    }

    const credentials = Buffer.from(`${this.config.user}:${this.config.password}`).toString('base64');
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      agent: undefined,
      cache: undefined,
      credentials: undefined,
      mode: undefined,
      redirect: undefined,
      referrerPolicy: undefined,
      signal: undefined,
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`ValueFirst token request failed: ${response.status} ${response.statusText}. ${body}`);
    }

    const data = JSON.parse(body);
    const token = data.token;
    ValueFirstSmsProvider.tokenCache.set(cacheKey, {
      token,
      expiry: now + 7 * 24 * 60 * 60 * 1000,
    });

    return token;
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const token = await this.getAccessToken();

    const merged = this.transform(bridgeProviderData, {
      user: this.config.user,
      password: this.config.password,
      from: options.from || this.config.from,
      to: options.to,
      text: options.content,
      entityId: undefined,
      dltTemplateId: undefined,
      dltContentType: undefined,
      headerId: undefined,
      seq: undefined,
      templateInfo: undefined,
    });

    const customData = options.customData || {};
    const passthroughBody = bridgeProviderData._passthrough?.body || {};

    const dlt: DLT = {
      entityId: customData.ENTITYID ?? passthroughBody.entityId ?? undefined,
      dltTemplateId: customData.DLTTEMPLATEID ?? passthroughBody.dltTemplateId ?? undefined,
      dltContentType: customData.DLTCONTENTTYPE ?? passthroughBody.dltContentType ?? undefined,
      templateInfo: customData.TEMPLATEINFO ?? passthroughBody.templateInfo ?? undefined,
      headerId: customData.HEADERID ?? passthroughBody.headerId ?? undefined,
    };

    const xml = this.buildXml(merged.body as Record<string, unknown>, dlt);

    const response = await fetch(this.BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/xml',
      },
      agent: undefined,
      cache: undefined,
      credentials: undefined,
      mode: undefined,
      redirect: undefined,
      referrerPolicy: undefined,
      signal: undefined,
      body: xml,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`ValueFirst SMS request failed: ${response.status} ${response.statusText}. ${responseText}`);
    }
    const messageId = this.extractMessageId(responseText);
    const errors = this.extractErrors(responseText);

    if (errors.length > 0) {
      throw new Error(`ValueFirst error codes: ${errors.join(', ')}`);
    }

    if (!messageId) {
      throw new Error('Failed to send message via ValueFirst: no GUID in response');
    }

    return {
      id: messageId,
      date: new Date().toISOString(),
    };
  }

  private buildXml(body: Record<string, unknown>, dlt: DLT = {}): string {
    const from = this.escapeXml(String(body.from || this.config.from));
    const to = this.escapeXml(this.removeNonNumeric(String(body.to)));

    const seq = body.seq ? ` SEQ="${this.escapeXml(String(body.seq))}"` : '';
    const tagAttr = body.tag ? ` TAG="${this.escapeXml(String(body.tag))}"` : '';
    const headerIdAttr = dlt.headerId ? ` HEADERID="${this.escapeXml(String(dlt.headerId))}"` : '';

    const smsAttrs = this.getSmsAttrs(body, dlt, to);

    const parts: string[] = [
      '<?xml version="1.0" encoding="ISO-8859-1"?>',
      '<!DOCTYPE MESSAGE SYSTEM "https://api.myvfirst.com/psms/dtd/messagev12.dtd">',
      '<MESSAGE>',
      '  <USER />',
      '  <DLR>YES</DLR>',
      `  <SMS ${smsAttrs}>`,
      `    <ADDRESS FROM="${from}" TO="${to}"${seq}${tagAttr}${headerIdAttr} />`,
      '  </SMS>',
      '</MESSAGE>',
    ];
    return parts.join('\n');
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private getSmsAttrs(body: Record<string, unknown>, dlt: DLT, to: string): string {
    const text = this.escapeXml(String(body.text));

    // SMS Configuration Attributes with defaults
    const udh = body.udh ? this.escapeXml(String(body.udh)) : '0';
    const coding = body.coding ? this.escapeXml(String(body.coding)) : '1';
    const property = body.property ? this.escapeXml(String(body.property)) : '0';

    const attrs = [`UDH="${udh}" TEXT="${text}" CODING="${coding}" PROPERTY="${property}" ID="${to}"`];

    // Scheduling Support (Optional SEND_ON attribute)
    if (body.sendOn) {
      attrs.push(`SEND_ON="${this.escapeXml(String(body.sendOn))}"`);
    }
    // DLT Attributes
    if (dlt.entityId) {
      attrs.push(`ENTITYID="${this.escapeXml(String(dlt.entityId))}"`);
    }
    if (dlt.dltTemplateId) {
      attrs.push(`DLTTEMPLATEID="${this.escapeXml(String(dlt.dltTemplateId))}"`);
    }
    if (dlt.dltContentType) {
      attrs.push(`DLTCONTENTTYPE="${this.escapeXml(String(dlt.dltContentType))}"`);
    }
    if (dlt.templateInfo) {
      attrs.push(`TEMPLATEINFO="${this.escapeXml(dlt.templateInfo)}"`);
    }
    return attrs.join(' ');
  }

  // ${to} should be country code + number without any non digit chars.
  private removeNonNumeric(to: string): string {
    return to.replace(/\D/g, '');
  }

  private extractMessageId(responseText: string): string | null {
    const match = responseText.match(/<GUID\s+GUID="([^"]+)"/i);
    return match ? match[1] : null;
  }

  private extractErrors(responseText: string): string[] {
    const errors: string[] = [];
    const regex = /<ERROR[^>]*CODE="([^"]+)"/gi;
    let match;
    while ((match = regex.exec(responseText)) !== null) {
      errors.push(match[1]);
    }
    return errors;
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.id || item.message_id);
    }
    return [body.id || body.message_id];
  }

  parseEventBody(body: any | any[], identifier: string): ISMSEventBody | undefined {
    if (Array.isArray(body)) {
      body = body.find((item) => (item.id || item.message_id) === identifier);
    }
    if (!body) {
      return undefined;
    }
    const event = body.status_error || body.msg_status || body.message_status || body.status;
    if (event === undefined || event === null || event === '') {
      return undefined;
    }
    const status = this.getStatus(event);
    if (status === undefined) {
      return undefined;
    }
    return {
      status,
      date:
        body.delivered_date || body.done_date || body.time
          ? new Date(body.delivered_date || body.done_date || body.time).toISOString()
          : new Date().toISOString(),
      externalId: body.id || body.message_id,
      attempts: body.attempt ? parseInt(body.attempt, 10) : 1,
      response: body.status_error || body.reason_code || body.response || '',
      row: body,
    };
  }

  private getStatus(event: string | number): SmsEventStatusEnum | undefined {
    if (typeof event === 'number' || /^\d+$/.test(String(event))) {
      const code = Number(event);
      if (code === 8448 || code === 0 || code === 1) return SmsEventStatusEnum.DELIVERED;
      if (code === 8449 || code === 8450) return SmsEventStatusEnum.FAILED;
      return undefined;
    }

    switch (event.toLowerCase()) {
      case 'delivered':
      case 'success':
        return SmsEventStatusEnum.DELIVERED;
      case 'not_delivered':
      case 'undelivered':
        return SmsEventStatusEnum.UNDELIVERED;
      case 'queued':
        return SmsEventStatusEnum.QUEUED;
      case 'sent':
        return SmsEventStatusEnum.SENT;
      case 'failed':
        return SmsEventStatusEnum.FAILED;
      case 'rejected':
        return SmsEventStatusEnum.REJECTED;
      default:
        return undefined;
    }
  }
}
