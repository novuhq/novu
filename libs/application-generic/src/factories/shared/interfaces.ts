import { ChannelTypeEnum, IConfigurations } from '@novu/shared';
import { ChannelProvider, IEmailEventBody, ISMSEventBody } from '@novu/stateless';

export interface IHandler {
  inboundWebhookEnabled(): boolean;

  getMessageId: (body: unknown | unknown[]) => string[];

  parseEventBody: (body: unknown | unknown[], identifier: string) => IEmailEventBody | ISMSEventBody | undefined;

  verifySignature: ({
    body,
    headers,
    rawBody,
  }: {
    body: Record<string, unknown>;
    headers: Record<string, string>;
    rawBody: unknown;
  }) => Promise<{ success: boolean; message?: string }>;

  autoConfigureInboundWebhook: (configurations: { webhookUrl: string }) => Promise<{
    success: boolean;
    message?: string;
    configurations?: IConfigurations;
  }>;
}

export abstract class BaseHandler<T extends ChannelProvider = ChannelProvider> implements IHandler {
  protected provider: T;
  protected providerId: string;
  protected channelType: string;

  protected constructor(providerId?: string, channelType?: string) {
    this.providerId = providerId;
    this.channelType = channelType;
  }

  canHandle(providerId: string, channelType: ChannelTypeEnum): boolean {
    return providerId === this.providerId && channelType === this.channelType;
  }

  public getProvider(): T {
    return this.provider;
  }

  public inboundWebhookEnabled(): boolean {
    return !!(this.provider?.getMessageId && this.provider?.parseEventBody);
  }

  public getMessageId(body: unknown | unknown[]): string[] {
    if (!this.provider?.getMessageId) {
      return [];
    }

    return this.provider.getMessageId(body);
  }

  public parseEventBody(body: unknown | unknown[], identifier: string): IEmailEventBody | ISMSEventBody | undefined {
    if (!this.provider?.parseEventBody) {
      return undefined;
    }

    const result = this.provider.parseEventBody(body, identifier);

    return result && typeof result === 'object' ? (result as IEmailEventBody | ISMSEventBody) : undefined;
  }

  public async verifySignature({
    rawBody,
    headers,
    body,
  }: {
    rawBody: unknown;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }): Promise<{ success: boolean; message?: string }> {
    if (!this.provider?.verifySignature) {
      // in case verifySignature is not implemented, we return true
      return { success: true, message: 'A support of signature verification is not implemented by provider' };
    }

    return this.provider.verifySignature({ rawBody, headers, body });
  }

  public async autoConfigureInboundWebhook(configurations: { webhookUrl: string }): Promise<{
    success: boolean;
    message?: string;
    configurations?: IConfigurations;
  }> {
    if (!this.provider?.autoConfigureInboundWebhook) {
      return Promise.resolve({
        success: false,
        message:
          'A support of auto-configuration of inbound webhook is not implemented by provider, manual configuration is required',
      });
    }

    return this.provider.autoConfigureInboundWebhook(configurations);
  }
}
