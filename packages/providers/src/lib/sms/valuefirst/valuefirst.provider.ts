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

export class ValueFirstSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.ValueFirst;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;

  private readonly TOKEN_URL = 'https://api.myvfirst.com/psms/api/messages/token?action=generate';
  private readonly BASE_URL = 'https://api.myvfirst.com/psms/servlet/psms.Eservice2';

  private token: string | null = null;
  private tokenExpiry = 0;

  constructor(
    private config: {
      apiKey: string;
      from: string;
    }
  ) {
    super();
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `API Key ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      agent: undefined,
      cache: undefined,
      credentials: undefined,
      mode: undefined,
      redirect: undefined,
      referrerPolicy: undefined,
      signal: undefined,
    });

    const data = await response.json();
    this.token = data.token;
    this.tokenExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;

    return this.token;
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const token = await this.getAccessToken();

    const merged = this.transform(bridgeProviderData, {
      user: this.config.apiKey,
      password: this.config.apiKey,
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

    const xml = this.buildXml(merged.body as Record<string, unknown>);

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
    const messageId = this.extractMessageId(responseText);

    if (!messageId) {
      const errorDesc = this.extractError(responseText);
      throw new Error(errorDesc || 'Failed to send message via ValueFirst');
    }

    return {
      id: messageId,
      date: new Date().toISOString(),
    };
  }

  private buildXml(body: Record<string, unknown>): string {
    const user = this.escapeXml(String(body.user || this.config.apiKey));
    const password = this.escapeXml(String(body.password || this.config.apiKey));
    const from = this.escapeXml(String(body.from || this.config.from));
    const to = this.escapeXml(String(body.to));
    const text = this.escapeXml(String(body.text));

    const smsChildren: string[] = [
      '    <UDH>0</UDH>',
      '    <CODING>1</CODING>',
      '    <PROPERTY>0</PROPERTY>',
      `    <TEXT>${text}</TEXT>`,
    ];

    const entityId = body.entityId ? this.escapeXml(String(body.entityId)) : null;
    const dltTemplateId = body.dltTemplateId ? this.escapeXml(String(body.dltTemplateId)) : null;
    const dltContentType = body.dltContentType ? this.escapeXml(String(body.dltContentType)) : null;
    const headerId = body.headerId ? this.escapeXml(String(body.headerId)) : null;
    const seq = body.seq ? this.escapeXml(String(body.seq)) : '1';
    const templateInfo = body.templateInfo ? this.escapeXml(String(body.templateInfo)) : null;

    if (dltTemplateId) {
      smsChildren.push(`    <DLTTEMPLATEID>${dltTemplateId}</DLTTEMPLATEID>`);
    }
    if (dltContentType) {
      smsChildren.push(`    <DLTCONTENTTYPE>${dltContentType}</DLTCONTENTTYPE>`);
    }
    if (templateInfo) {
      smsChildren.push(`    <TEMPLATEINFO>${templateInfo}</TEMPLATEINFO>`);
    }

    smsChildren.push(
      '    <ADDRESS>',
      `      <FROM>${from}</FROM>`,
      `      <TO>${to}</TO>`,
      `      <SEQ>${seq}</SEQ>`
    );
    if (headerId) {
      smsChildren.push(`      <HEADERID>${headerId}</HEADERID>`);
    }
    smsChildren.push('    </ADDRESS>');

    const processedKeys = new Set([
      'user', 'password', 'from', 'to', 'text',
      'entityId', 'dltTemplateId', 'dltContentType', 'headerId', 'seq', 'templateInfo',
    ]);
    const passthroughLines = Object.entries(body)
      .filter(([key]) => !processedKeys.has(key))
      .map(([key, value]) => `    <${key.replace(/([A-Z])/g, '_$1').toUpperCase()}>${this.escapeXml(String(value))}</${key.replace(/([A-Z])/g, '_$1').toUpperCase()}>`);

    if (passthroughLines.length > 0) {
      smsChildren.push(...passthroughLines);
    }

    const parts: string[] = [
      '<?xml version="1.0"?>',
      '<!DOCTYPE MESSAGE SYSTEM "https://api.myvfirst.com/psms/dtd/messagev12.dtd">',
      '<MESSAGE>',
      `  <USERNAME>${user}</USERNAME>`,
      `  <PASSWORD>${password}</PASSWORD>`,
      '  <DLR>YES</DLR>',
      `  <SENDER>${from}</SENDER>`,
    ];

    if (entityId) {
      parts.push(`  <ENTITYID>${entityId}</ENTITYID>`);
    }

    parts.push('  <SMS>');
    parts.push(...smsChildren);
    parts.push('  </SMS>', '</MESSAGE>');

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

  private extractMessageId(responseText: string): string | null {
    const match = responseText.match(/<MESSAGEID[^>]*>(\s*[\w-]+\s*)<\/MESSAGEID>/i);
    return match ? match[1].trim() : null;
  }

  private extractError(responseText: string): string | null {
    const match = responseText.match(/<ERRORDESC[^>]*>(.*?)<\/ERRORDESC>/i);
    return match ? match[1].trim() : null;
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
    const status = this.getStatus(body.status_error || body.msg_status || body.message_status || body.status);
    if (status === undefined) {
      return undefined;
    }
    return {
      status,
      date: body.delivered_date || body.done_date || body.time
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
      if (code === 8448 || code === 1) return SmsEventStatusEnum.DELIVERED;
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
