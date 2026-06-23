import type { Adapter } from 'chat';
import { NovuEmailAdapterImpl } from './adapter.js';
import type { NovuEmailAdapterConfig, NovuEmailRawMessage, NovuEmailThreadId } from './types.js';

export type {
  ActionButtonStyle,
  ActionUrlBuilder,
  EmailWebhookPayload,
  NovuEmailAdapterConfig,
  NovuEmailAttachment,
  NovuEmailRawMessage,
  NovuEmailThreadId,
  SendEmailAttachment,
  SendEmailParams,
} from './types.js';

export function createNovuEmailAdapter(
  config: NovuEmailAdapterConfig
): Adapter<NovuEmailThreadId, NovuEmailRawMessage> {
  return new NovuEmailAdapterImpl(config);
}
