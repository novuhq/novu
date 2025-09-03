import { IConfigurations } from '@novu/shared';
import { IEmailEventBody, ISMSEventBody } from '@novu/stateless';

export interface IHandler {
  inboundWebhookEnabled(): boolean;

  getMessageId: (body: any | any[]) => string[];

  parseEventBody: (body: any | any[], identifier: string) => IEmailEventBody | ISMSEventBody | undefined;

  verifySignature: (body: any, headers: Record<string, string>) => { success: boolean; message?: string };

  autoConfigureInboundWebhook: (configurations: IConfigurations) => { success: boolean; message?: string };
}

export abstract class BaseHandler {
  inboundWebhookEnabled() {
    return false;
  }

  getMessageId(body: any | any[]) {
    return [];
  }

  parseEventBody(body: any | any[], identifier: string) {
    return undefined;
  }

  verifySignature(body: any, headers: Record<string, string>) {
    return { success: false, message: 'Not implemented' };
  }

  autoConfigureInboundWebhook(configurations: IConfigurations) {
    return { success: false, message: 'Not implemented' };
  }
}
