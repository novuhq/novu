import type { AdapterPostableMessage, RawMessage, StreamChunk, StreamOptions } from 'chat';
import { StreamingMarkdownRenderer } from 'chat';

import type { NovuRawMessage } from './types.js';

/** Send-once platforms: WhatsApp/Messenger, email, and GitHub comments. */
const BUFFERED_STREAM_PLATFORMS = new Set(['whatsapp', 'email', 'messenger', 'github']);

const DEFAULT_STREAM_UPDATE_INTERVAL_MS = 500;
/** Official Telegram edit floors (DMs ~1/s, groups slower). */
const TELEGRAM_PRIVATE_STREAMING_EDIT_INTERVAL_MS = 1100;
const TELEGRAM_NON_PRIVATE_STREAMING_EDIT_INTERVAL_MS = 3100;

type StreamDeliveryContext = {
  platform: string;
  isDM?: boolean;
};

export function shouldBufferStream(platform: string): boolean {
  return BUFFERED_STREAM_PLATFORMS.has(platform.toLowerCase());
}

function streamChunkText(chunk: string | StreamChunk): string | null {
  if (typeof chunk === 'string') {
    return chunk;
  }

  if (chunk.type === 'markdown_text') {
    return chunk.text;
  }

  return null;
}

export function appendStreamChunk(accumulated: string, chunk: string | StreamChunk): string {
  const text = streamChunkText(chunk);

  return text === null ? accumulated : accumulated + text;
}

export async function consumeTextStream(textStream: AsyncIterable<string | StreamChunk>): Promise<string> {
  let accumulated = '';

  for await (const chunk of textStream) {
    accumulated = appendStreamChunk(accumulated, chunk);
  }

  return accumulated;
}

function resolveStreamUpdateIntervalMs(platform: string, isDM: boolean, updateIntervalMs?: number): number {
  const requested =
    typeof updateIntervalMs === 'number' && Number.isFinite(updateIntervalMs) && updateIntervalMs >= 0
      ? updateIntervalMs
      : DEFAULT_STREAM_UPDATE_INTERVAL_MS;

  if (platform.toLowerCase() !== 'telegram') {
    return requested;
  }

  const floor = isDM ? TELEGRAM_PRIVATE_STREAMING_EDIT_INTERVAL_MS : TELEGRAM_NON_PRIVATE_STREAMING_EDIT_INTERVAL_MS;

  return Math.max(requested, floor);
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
  options?: StreamOptions,
  context?: StreamDeliveryContext
): Promise<RawMessage<NovuRawMessage>> {
  const platform = (context?.platform ?? '').toLowerCase();
  const isDM = context?.isDM ?? false;
  const intervalMs = resolveStreamUpdateIntervalMs(platform, isDM, options?.updateIntervalMs);

  const renderer = new StreamingMarkdownRenderer();
  let msg: RawMessage<NovuRawMessage> | null = null;
  let lastEditContent = '';
  let stopped = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let pendingEdit: Promise<void> | null = null;

  const stopTimer = (): void => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const liveContent = (): string => renderer.render().trim();

  const finalContent = (): string => {
    renderer.finish();

    return renderer.getText().trim() || ' ';
  };

  const doEditAndReschedule = async (): Promise<void> => {
    if (stopped || !msg) {
      return;
    }

    const content = liveContent();
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

  const finalize = async (): Promise<void> => {
    stopped = true;
    stopTimer();
    if (pendingEdit) {
      await pendingEdit;
    }

    if (!msg) {
      return;
    }

    const content = finalContent();
    if (content !== lastEditContent) {
      msg = await deps.editMessage(threadId, msg.id, { markdown: content });
      lastEditContent = content;
    }
  };

  for await (const chunk of textStream) {
    if (options?.signal?.aborted) {
      break;
    }

    const text = streamChunkText(chunk);
    if (text === null) {
      continue;
    }

    renderer.push(text);

    if (!msg) {
      const content = liveContent();
      if (!content) {
        continue;
      }

      msg = await deps.postMessage(threadId, { markdown: content });
      lastEditContent = content;
      scheduleEdits();
    }
  }

  await finalize();

  if (!msg) {
    return deps.postMessage(threadId, { markdown: finalContent() });
  }

  return msg;
}
