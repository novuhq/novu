import type { AdapterPostableMessage, RawMessage, StreamChunk, StreamOptions } from 'chat';

import type { NovuRawMessage } from './types.js';

const BUFFERED_STREAM_PLATFORMS = new Set(['whatsapp', 'email', 'messenger', 'github']);

export function shouldBufferStream(platform: string): boolean {
  return BUFFERED_STREAM_PLATFORMS.has(platform.toLowerCase());
}

export function appendStreamChunk(accumulated: string, chunk: string | StreamChunk): string {
  if (typeof chunk === 'string') {
    return accumulated + chunk;
  }

  if (chunk.type === 'markdown_text') {
    return accumulated + chunk.text;
  }

  return accumulated;
}

export async function consumeTextStream(textStream: AsyncIterable<string | StreamChunk>): Promise<string> {
  let accumulated = '';

  for await (const chunk of textStream) {
    accumulated = appendStreamChunk(accumulated, chunk);
  }

  return accumulated;
}

type StreamDeliveryDeps = {
  postMessage: (threadId: string, message: AdapterPostableMessage) => Promise<RawMessage<NovuRawMessage>>;
  editMessage: (
    threadId: string,
    messageId: string,
    message: AdapterPostableMessage
  ) => Promise<RawMessage<NovuRawMessage>>;
};

export async function deliverBufferedStream(
  threadId: string,
  textStream: AsyncIterable<string | StreamChunk>,
  deps: StreamDeliveryDeps
): Promise<RawMessage<NovuRawMessage>> {
  const accumulated = await consumeTextStream(textStream);
  const markdown = accumulated.trim() || ' ';

  return deps.postMessage(threadId, { markdown });
}

export async function deliverStreamingWithEdits(
  threadId: string,
  textStream: AsyncIterable<string | StreamChunk>,
  deps: StreamDeliveryDeps,
  options?: StreamOptions
): Promise<RawMessage<NovuRawMessage>> {
  const intervalMs = options?.updateIntervalMs ?? 500;
  let accumulated = '';
  let msg: RawMessage<NovuRawMessage> | null = null;
  let lastEditContent = '';
  let stopped = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let pendingEdit: Promise<void> | null = null;

  const doEditAndReschedule = async (): Promise<void> => {
    if (stopped || !msg) {
      return;
    }

    const content = accumulated.trim();
    if (content && content !== lastEditContent) {
      msg = await deps.editMessage(threadId, msg.id, { markdown: content });
      lastEditContent = content;
    }

    if (!stopped) {
      timerId = setTimeout(() => {
        pendingEdit = doEditAndReschedule();
      }, intervalMs);
    }
  };

  const scheduleEdits = (): void => {
    timerId = setTimeout(() => {
      pendingEdit = doEditAndReschedule();
    }, intervalMs);
  };

  for await (const chunk of textStream) {
    accumulated = appendStreamChunk(accumulated, chunk);

    if (!msg) {
      const content = accumulated.trim();
      if (!content) {
        continue;
      }

      msg = await deps.postMessage(threadId, { markdown: content });
      lastEditContent = content;
      scheduleEdits();
    }
  }

  stopped = true;
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }

  if (pendingEdit) {
    await pendingEdit;
  }

  const finalContent = accumulated.trim() || ' ';

  if (!msg) {
    return deps.postMessage(threadId, { markdown: finalContent });
  }

  if (finalContent !== lastEditContent) {
    return deps.editMessage(threadId, msg.id, { markdown: finalContent });
  }

  return msg;
}
