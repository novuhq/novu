export type DataStreamFrame = { type: string } & Record<string, unknown>;

/**
 * Minimal parser for the AI SDK UI-message data stream: SSE `data:` lines with
 * JSON frames, terminated by `data: [DONE]`. Handles frames split across
 * network chunks; malformed lines are skipped so a single bad frame can't kill
 * the stream.
 */
export async function* parseDataStream(body: ReadableStream<Uint8Array>): AsyncGenerator<DataStreamFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        for (const frame of parseEventLines(rawEvent)) {
          if (frame === DONE) return;
          yield frame;
        }

        separatorIndex = buffer.indexOf('\n\n');
      }
    }

    // Flush a trailing event without a final blank line (server closed early).
    for (const frame of parseEventLines(buffer)) {
      if (frame === DONE) return;
      yield frame;
    }
  } finally {
    reader.releaseLock();
  }
}

const DONE = Symbol('done');

function parseEventLines(rawEvent: string): Array<DataStreamFrame | typeof DONE> {
  const frames: Array<DataStreamFrame | typeof DONE> = [];

  for (const line of rawEvent.split('\n')) {
    if (!line.startsWith('data:')) continue;

    const payload = line.slice('data:'.length).trim();
    if (!payload) continue;
    if (payload === '[DONE]') {
      frames.push(DONE);
      break;
    }

    try {
      const frame = JSON.parse(payload) as DataStreamFrame;
      if (frame && typeof frame === 'object' && typeof frame.type === 'string') {
        frames.push(frame);
      }
    } catch {
      // Skip malformed frames.
    }
  }

  return frames;
}
