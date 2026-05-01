import type { Adapter } from 'chat';
import { NovuEmailAdapterImpl } from './adapter.js';
import type { NovuEmailAdapterConfig, NovuEmailRawMessage, NovuEmailThreadId } from './types.js';

export type { NovuEmailAdapterConfig, NovuEmailRawMessage, NovuEmailThreadId, SendEmailParams } from './types.js';
export type { EmailWebhookPayload, NovuEmailAttachment } from './types.js';

export function createNovuEmailAdapter(
  config: NovuEmailAdapterConfig
): Adapter<NovuEmailThreadId, NovuEmailRawMessage> {
  return new NovuEmailAdapterImpl(config);
}
