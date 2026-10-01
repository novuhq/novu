import type { StreamPart } from '@novu/thalamus';

type TextDelta = Extract<StreamPart, { type: 'text-delta' }>;

/** Max time a delta waits in the buffer before it is flushed for delivery. */
const DELTA_COALESCE_WINDOW_MS = 250;
/** Flush early once a buffered preview grows past this many characters. */
const DELTA_COALESCE_MAX_CHARS = 4096;

/**
 * Merges consecutive `text-delta` parts for the same message into one part so the
 * observer persists and POSTs one webhook per window instead of one per fragment.
 *
 * Every part leaves through `onFlush`, in stream order: any other part (the durable
 * `message`, step/tool parts, `error`) flushes the buffer first and goes out right
 * after it. A delta for a different message also flushes. A timer flushes a quiet
 * buffer after the window; `flush()` drains it at stream end.
 */
export class DeltaCoalescer {
  private pending: TextDelta | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly onFlush: (parts: StreamPart[]) => void) {}

  push(part: StreamPart): void {
    if (part.type !== 'text-delta') {
      this.emit([...this.take(), part]);

      return;
    }

    if (this.pending && this.pending.messageId !== part.messageId) {
      this.emit(this.take());
    }

    if (this.pending) {
      this.pending = { ...this.pending, text: this.pending.text + part.text };
    } else {
      this.pending = part;
      this.timer = setTimeout(() => this.emit(this.take()), DELTA_COALESCE_WINDOW_MS);
    }

    if (this.pending.text.length >= DELTA_COALESCE_MAX_CHARS) {
      this.emit(this.take());
    }
  }

  flush(): void {
    this.emit(this.take());
  }

  private take(): StreamPart[] {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.pending) return [];
    const part = this.pending;
    this.pending = null;

    return [part];
  }

  private emit(parts: StreamPart[]): void {
    if (parts.length > 0) this.onFlush(parts);
  }
}

/** Live-only parts: best effort, never worth blocking or retrying durable delivery for. */
export function isEphemeralPart(part: StreamPart): boolean {
  return part.type === 'text-start' || part.type === 'text-delta';
}
