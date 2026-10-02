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
 * Text of the replies still being generated in one observation, relayed to at most
 * one `/live` reader per reply. Previews are best effort: nothing here is persisted,
 * the durable `message` webhook stays the record.
 */
export class LiveReplies {
  private replies = new Map<string, Reply>();

  handle(part: StreamPart): void {
    switch (part.type) {
      case 'text-start':
        if (!this.replies.has(part.messageId)) this.replies.set(part.messageId, { text: '' });
        return;
      case 'text-delta': {
        const reply = part.messageId ? this.replies.get(part.messageId) : undefined;
        if (!reply) return;
        reply.text += part.text;
        this.send(reply, { type: 'text', text: part.text });
        return;
      }
      case 'message': {
        const id = part.messageId;
        const reply = id ? this.replies.get(id) : undefined;
        if (!id || !reply) return;
        // Shed deltas leave a prefix of the final text: send the part the reader missed.
        if (part.text.length > reply.text.length && part.text.startsWith(reply.text)) {
          this.send(reply, { type: 'text', text: part.text.slice(reply.text.length) });
        }
        this.end(id, 'complete');
        return;
      }
      case 'step-done':
        // The model request ended; a reply still open here got no durable message.
        this.endAll('interrupted');
        return;
    }
  }

  /** Opens the reader stream for a reply, or returns null when it already has a reader. */
  open(messageId: string): ReadableStream<Uint8Array> | null {
    const reply = this.replies.get(messageId);
    if (reply?.writer) return null;

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    if (!reply) {
      writer.write(encoder.encode(encodeLiveEvent({ type: 'end', reason: 'complete' }))).catch(() => {});
      writer.close().catch(() => {});

      return readable;
    }

    reply.writer = writer;
    reply.ping = setInterval(() => this.write(reply, ': ping\n\n'), PING_INTERVAL_MS);
    if (reply.text) this.send(reply, { type: 'text', text: reply.text });

    return readable;
  }

  endAll(reason: LiveEndReason): void {
    for (const id of [...this.replies.keys()]) this.end(id, reason);
  }

  private end(messageId: string, reason: LiveEndReason): void {
    const reply = this.replies.get(messageId);
    if (!reply) return;
    this.replies.delete(messageId);
    const { writer } = reply;
    this.send(reply, { type: 'end', reason });
    this.detach(reply);
    writer?.close().catch(() => {});
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
