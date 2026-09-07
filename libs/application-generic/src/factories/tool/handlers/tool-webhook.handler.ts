import { ToolWebhookProvider } from '@novu/providers';
import { ICredentials, ToolProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseToolHandler } from './base.handler';

export class ToolWebhookHandler extends BaseToolHandler {
  constructor() {
    super(ToolProviderIdEnum.Webhook, ChannelTypeEnum.TOOL);
  }

  buildProvider(credentials: ICredentials) {
    const isDynamic = credentials.routingMode === 'dynamic';

    if (!isDynamic && !credentials.webhookUrl) {
      throw new Error('Config is not valid for tool-webhook provider');
    }

    let headers: Record<string, string> | undefined;
    if (credentials.headers) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(credentials.headers);
      } catch {
        throw new Error('Tool webhook headers must be a valid JSON object');
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Tool webhook headers must be a valid JSON object');
      }

      headers = parsed as Record<string, string>;
    }

    this.provider = new ToolWebhookProvider({
      webhookUrl: credentials.webhookUrl,
      method: credentials.method,
      headers,
      bodyTemplate: credentials.body,
      hmacSecretKey: credentials.secretKey,
    });
  }
}
