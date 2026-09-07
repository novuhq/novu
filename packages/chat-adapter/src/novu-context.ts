import type { NovuContext, NovuContextSource, Signal } from './types.js';

/**
 * Opt-in Novu-only capabilities for a thread. Ported Chat SDK bots ignore this;
 * Novu-aware handlers call it to trigger workflows, read conversation state,
 * persist metadata, or resolve the conversation. Each mutating call emits its own
 * reply POST.
 *
 * @example
 *   chat.onSubscribedMessage(async (thread, message) => {
 *     const novu = getNovuContext(thread);
 *     const history = await novu.getHistory();
 *     const llmMessages = history.map((h) => ({ role: h.role, content: h.content }));
 *     if (novu.platform === 'whatsapp') {
 *       await novu.trigger('escalation', { payload: { text: message.text } });
 *     }
 *   });
 */
export function getNovuContext(thread: { id: string; adapter: unknown }): NovuContext {
  const source = thread.adapter as unknown as NovuContextSource;
  if (
    typeof source?.emitSignals !== 'function' ||
    typeof source?.decodeThreadId !== 'function' ||
    typeof source?.getSnapshot !== 'function'
  ) {
    throw new Error('getNovuContext() requires a thread owned by the Novu adapter');
  }

  const threadId = thread.id;
  const { platform } = source.decodeThreadId(threadId);

  const emit = (signal: Signal) => source.emitSignals(threadId, [signal]);
  const snapshot = () => source.getSnapshot(threadId);

  return {
    platform,
    getSubscriber: async () => (await snapshot())?.subscriber ?? null,
    getConversation: async () => (await snapshot())?.conversation ?? null,
    getHistory: async () => (await snapshot())?.history ?? [],
    getEmailContext: async () => (await snapshot())?.platformContext?.email ?? null,
    getMetadata: async (key) => (await snapshot())?.conversation.metadata?.[key],
    trigger: (workflowId, opts) =>
      emit({
        type: 'trigger',
        workflowId,
        to: opts?.to,
        payload: opts?.payload,
      }),
    setMetadata: (key, value) => emit({ type: 'metadata', action: 'set', key, value }),
    deleteMetadata: (key) => emit({ type: 'metadata', action: 'delete', key }),
    clearMetadata: () => emit({ type: 'metadata', action: 'clear' }),
    resolve: (summary) => source.emitResolve(threadId, summary),
  };
}
