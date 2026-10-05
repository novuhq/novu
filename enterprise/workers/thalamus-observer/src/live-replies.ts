import type { StreamPart } from '@novu/thalamus';
import { encodeLiveEvent, type LiveEndReason, type LiveEvent } from '@novu/thalamus/durable';

const PING_INTERVAL_MS = 15_000;
const encoder = new TextEncoder();

interface Reply {
  text: string;
  writer?: WritableStreamDefaultWriter<Uint8Array>;
  ping?: ReturnType<typeof setInterval>;
}

/**
 * Text of the replies still being generated in one observation, relayed to at most one
 * `/live` reader per reply. A completed reply ends with its `message` text; nothing here
 * is persisted.
 */
export class LiveReplies {
  private replies = new Map<string, Reply>();

  /** Returns true for a `message` whose text reached its live reader, which then delivers it. */
  handle(part: StreamPart): boolean {
    switch (part.type) {
      case 'text-start':
        if (!this.replies.has(part.messageId)) this.replies.set(part.messageId, { text: '' });
        return false;
      case 'text-delta': {
        const reply = part.messageId ? this.replies.get(part.messageId) : undefined;
        if (!reply) return false;
        reply.text += part.text;
        this.send(reply, { type: 'text', text: part.text });
        return false;
      }
      case 'message':
        return part.messageId ? this.end(part.messageId, { type: 'end', reason: 'complete', text: part.text }) : false;
      case 'step-done':
        // The model request ended; a reply still open here got no durable message.
        this.endAll('interrupted');
        return false;
      default:
        return false;
    }
  }

  /** Opens the reader stream for a reply still being generated. */
  open(messageId: string): ReadableStream<Uint8Array> | 'unknown' | 'busy' {
    const reply = this.replies.get(messageId);
    if (!reply) return 'unknown';
    if (reply.writer) return 'busy';

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    reply.writer = writable.getWriter();
    reply.ping = setInterval(() => this.write(reply, ': ping\n\n'), PING_INTERVAL_MS);
    if (reply.text) this.send(reply, { type: 'text', text: reply.text });

    return readable;
  }

  endAll(reason: Exclude<LiveEndReason, 'complete'>): void {
    for (const id of [...this.replies.keys()]) this.end(id, { type: 'end', reason });
  }

  /** Returns whether a reader was still connected. */
  private end(messageId: string, event: Extract<LiveEvent, { type: 'end' }>): boolean {
    const reply = this.replies.get(messageId);
    if (!reply) return false;
    this.replies.delete(messageId);
    const { writer } = reply;
    this.send(reply, event);
    this.detach(reply);
    writer?.close().catch(() => {});

    return writer !== undefined;
  }

  private send(reply: Reply, event: LiveEvent): void {
    this.write(reply, encodeLiveEvent(event));
  }

  private write(reply: Reply, chunk: string): void {
    const { writer } = reply;
    if (!writer) return;
    // Rejects once the reader disconnected; the reply keeps buffering without it.
    writer.write(encoder.encode(chunk)).catch(() => {
      if (reply.writer === writer) this.detach(reply);
    });
  }

  private detach(reply: Reply): void {
    clearInterval(reply.ping);
    reply.writer = undefined;
    reply.ping = undefined;
  }
}
