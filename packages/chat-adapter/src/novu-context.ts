import type { AdapterThread, NovuContext, NovuContextSource, Signal } from './types.js';

/**
 * Opt-in Novu-only capabilities for a thread. Ported Chat SDK bots ignore this;
 * Novu-aware handlers call it to trigger workflows, persist conversation
 * metadata, or resolve the conversation. Each call emits its own reply POST.
 *
 * @example
 *   chat.onSubscribedMessage(async (thread, message) => {
 *     const novu = getNovuContext(thread);
 *     if (novu.platform === 'whatsapp') {
 *       await novu.trigger('escalation', { payload: { text: message.text } });
 *     }
 *   });
 */
export function getNovuContext(thread: AdapterThread): NovuContext {
  const source = thread.adapter as unknown as NovuContextSource;
  if (typeof source?.emitSignals !== 'function' || typeof source?.decodeThreadId !== 'function') {
    throw new Error('getNovuContext() requires a thread owned by the Novu adapter');
  }

  const threadId = thread.id;
  const { platform } = source.decodeThreadId(threadId);

  const emit = (signal: Signal) => source.emitSignals(threadId, [signal]);

  return {
    platform,
    trigger: (workflowId, opts) => emit({ type: 'trigger', workflowId, to: opts?.to, payload: opts?.payload }),
    setMetadata: (key, value) => emit({ type: 'metadata', action: 'set', key, value }),
    deleteMetadata: (key) => emit({ type: 'metadata', action: 'delete', key }),
    resolve: (summary) => source.emitResolve(threadId, summary),
  };
}
