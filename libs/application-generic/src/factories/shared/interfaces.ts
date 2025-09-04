import { IEmailEventBody, ISMSEventBody } from '@novu/stateless';

export interface IHandler {
  inboundWebhookEnabled?(): boolean;

  getMessageId?: (body: any | any[]) => string[];

  parseEventBody?: (body: any | any[], identifier: string) => IEmailEventBody | ISMSEventBody | undefined;

  verifySignature?: (body: any, headers: Record<string, string>) => { success: boolean; message?: string };
}
