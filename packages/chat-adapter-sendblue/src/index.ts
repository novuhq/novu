import type { Adapter } from 'chat';
import type { SendblueMessagePayload, SendblueThreadId } from 'chat-adapter-sendblue';
import { SendblueAdapterImpl } from './adapter.js';
import type { SendblueAdapterConfig } from './types.js';

export type { SendblueMessagePayload, SendblueThreadId } from 'chat-adapter-sendblue';
export type { SendblueAdapterConfig } from './types.js';

export function createSendblueAdapter(
  config: SendblueAdapterConfig
): Adapter<SendblueThreadId, SendblueMessagePayload> {
  return new SendblueAdapterImpl(config);
}
