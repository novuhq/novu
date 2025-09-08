import { ChannelTypeEnum, IConfigurations } from '@novu/shared';
import { IEmailEventBody, ISMSEventBody } from '@novu/stateless';

export interface IHandler {
  inboundWebhookEnabled(): boolean;

  getMessageId: (body: unknown | unknown[]) => string[];

  parseEventBody: (body: unknown | unknown[], identifier: string) => IEmailEventBody | ISMSEventBody | undefined;

  verifySignature: (body: unknown, headers: Record<string, string>) => { success: boolean; message?: string };

  autoConfigureInboundWebhook: (configurations: { webhookUrl: string }) => Promise<{
    success: boolean;
    message?: string;
    configurations?: IConfigurations;
  }>;
}

interface IProviderWithWebhookMethods {
  getMessageId?: (body: unknown | unknown[]) => string[];
  parseEventBody?: (body: unknown | unknown[], identifier: string) => IEmailEventBody | ISMSEventBody | undefined;
  verifySignature?: (body: unknown, headers: Record<string, string>) => { success: boolean; message?: string };
  autoConfigureInboundWebhook?: (configurations: { webhookUrl: string }) => Promise<{
    success: boolean;
    message?: string;
    configurations?: IConfigurations;
  }>;
}

export abstract class BaseHandler<T extends IProviderWithWebhookMethods = IProviderWithWebhookMethods>
  implements IHandler
{
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

    return this.provider.parseEventBody(body, identifier);
  }

  public verifySignature(body: unknown, headers: Record<string, string>): { success: boolean; message?: string } {
    if (!this.provider?.verifySignature) {
      // in case verifySignature is not implemented, we return true
      return { success: true, message: 'Not implemented by provider' };
    }

    return this.provider.verifySignature(body, headers);
  }

  public async autoConfigureInboundWebhook(configurations: { webhookUrl: string }): Promise<{
    success: boolean;
    message?: string;
    configurations?: IConfigurations;
  }> {
    if (!this.provider?.autoConfigureInboundWebhook) {
      return Promise.resolve({ success: false, message: 'Not implemented by provider' });
    }

    return this.provider.autoConfigureInboundWebhook(configurations);
  }
}
