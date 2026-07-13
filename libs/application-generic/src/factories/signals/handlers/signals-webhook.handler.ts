import { SignalsWebhookProvider } from '@novu/providers';
import { ICredentials, SignalsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseSignalsHandler } from './base.handler';

export class SignalsWebhookHandler extends BaseSignalsHandler {
  constructor() {
    super(SignalsProviderIdEnum.Webhook, ChannelTypeEnum.SIGNALS);
  }

  buildProvider(credentials: ICredentials) {
    if (!credentials.webhookUrl) {
      throw new Error('Config is not valid for signals-webhook provider');
    }

    let headers: Record<string, string> | undefined;
    if (credentials.headers) {
      try {
        headers = JSON.parse(credentials.headers) as Record<string, string>;
      } catch {
        throw new Error('Signals webhook headers must be a valid JSON object');
      }
    }

    this.provider = new SignalsWebhookProvider({
      webhookUrl: credentials.webhookUrl,
      method: credentials.method,
      headers,
      bodyTemplate: credentials.body,
      hmacSecretKey: credentials.secretKey,
    });
  }
}
