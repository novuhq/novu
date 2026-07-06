import type { Adapter } from 'chat';
import { NovuWebAdapterImpl } from './adapter.js';
import type { NovuWebAdapterConfig, NovuWebRawMessage, NovuWebThreadId } from './types.js';

export {
  buildWebStreamChannel,
  decodeWebThreadId,
  encodeWebThreadId,
  WEB_CONVERSATION_ID_PATTERN,
  WEB_THREAD_PREFIX,
  webChannelIdFromThreadId,
} from './thread-id.js';
export type {
  NovuWebAdapter,
  NovuWebAdapterConfig,
  NovuWebRawMessage,
  NovuWebThreadId,
  WebFileRef,
  WebMessageContent,
  WebOutboundEvent,
} from './types.js';

export function createNovuWebAdapter(config: NovuWebAdapterConfig): Adapter<NovuWebThreadId, NovuWebRawMessage> {
  return new NovuWebAdapterImpl(config);
}
