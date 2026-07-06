import type { Response } from 'express';
import type { WebOutboundEvent } from './web-relay-events';

/**
 * Turn-lifecycle timeouts, all overridable via env:
 * - firstEventTimeoutMs: close if the agent produces nothing at all.
 * - settleMs: close shortly after a reply lands with no typing indicator
 *   active — the common single-reply turn.
 * - idleTimeoutMs: safety net — close when no events arrive for this long
 *   after the first reply (covers a typing indicator that never resolves).
 * - maxDurationMs: hard cap on stream lifetime.
 *
 * Replies arriving after the stream closes are persistence-only and reach the
 * client on the next history refetch (by design — see plan decision 4).
 */
export interface WebSseWriterOptions {
  firstEventTimeoutMs: number;
  settleMs: number;
  idleTimeoutMs: number;
  maxDurationMs: number;
}

/** Resolved per stream so env overrides apply without a process restart (and are testable). */
export function resolveWebSseOptions(): WebSseWriterOptions {
  return {
    firstEventTimeoutMs: parsePositiveIntEnv(process.env.AGENT_WEB_SSE_FIRST_EVENT_TIMEOUT_MS, 120_000),
    settleMs: parsePositiveIntEnv(process.env.AGENT_WEB_SSE_SETTLE_MS, 3_000),
    idleTimeoutMs: parsePositiveIntEnv(process.env.AGENT_WEB_SSE_IDLE_TIMEOUT_MS, 30_000),
    maxDurationMs: parsePositiveIntEnv(process.env.AGENT_WEB_SSE_MAX_DURATION_MS, 300_000),
  };
}

function parsePositiveIntEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

/**
 * Streams agent replies to the browser as an AI SDK UI-message data stream
 * (SSE `data:` frames, `[DONE]` terminated). Relay events map onto standard
 * text parts plus `data-*` custom parts:
 *
 * - message  → `data-message-start` {messageId, createdAt} grouping marker,
 *              then `text-start`/`text-delta`/`text-end` for markdown (one
 *              delta today; token streaming later means more deltas — wire
 *              compatible), `data-card`, `data-files`.
 * - edit     → `data-message-edit` {messageId, content}
 * - delete   → `data-message-delete` {messageId}
 * - typing   → transient `data-typing` {status} ('' = stopped)
 * - reaction → transient `data-reaction` {messageId, emoji, added}
 */
export class WebSseWriter {
  private ended = false;
  private messageCount = 0;
  private typingActive = false;

  private firstEventTimer: NodeJS.Timeout | null = null;
  private settleTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private maxTimer: NodeJS.Timeout | null = null;

  private readonly donePromise: Promise<void>;
  private resolveDone!: () => void;

  constructor(
    private readonly res: Response,
    private readonly options: WebSseWriterOptions = resolveWebSseOptions()
  ) {
    this.donePromise = new Promise((resolve) => {
      this.resolveDone = resolve;
    });
  }

  /** Writes SSE headers and the protocol `start` frame, arms lifecycle timers. */
  begin(): void {
    this.res.status(200);
    this.res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    this.res.setHeader('Cache-Control', 'no-cache, no-transform');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.setHeader('X-Accel-Buffering', 'no');
    this.res.setHeader('x-vercel-ai-ui-message-stream', 'v1');
    this.res.flushHeaders();

    this.res.on('close', () => this.end());

    this.writeFrame({ type: 'start' });

    this.firstEventTimer = setTimeout(() => this.end(), this.options.firstEventTimeoutMs);
    this.maxTimer = setTimeout(() => this.end(), this.options.maxDurationMs);
  }

  /** Resolves when the stream has been terminated (any close cause). */
  get done(): Promise<void> {
    return this.donePromise;
  }

  onRelayEvent(event: WebOutboundEvent): void {
    if (this.ended) return;

    this.clearTimer('firstEventTimer');
    this.clearTimer('settleTimer');
    this.armIdleTimer();

    switch (event.kind) {
      case 'message': {
        this.messageCount += 1;
        // A posted message implicitly ends the typing indicator.
        this.typingActive = false;
        this.writeMessageFrames(event.messageId, event.content, event.ts);
        this.armSettleTimer();
        break;
      }
      case 'edit': {
        this.writeFrame({ type: 'data-message-edit', data: { messageId: event.messageId, content: event.content } });
        this.armSettleTimerIfIdle();
        break;
      }
      case 'delete': {
        this.writeFrame({ type: 'data-message-delete', data: { messageId: event.messageId } });
        this.armSettleTimerIfIdle();
        break;
      }
      case 'typing': {
        this.typingActive = event.status !== '';
        this.writeFrame({ type: 'data-typing', data: { status: event.status }, transient: true });
        if (!this.typingActive) {
          this.armSettleTimerIfIdle();
        }
        break;
      }
      case 'reaction': {
        this.writeFrame({
          type: 'data-reaction',
          data: { messageId: event.messageId, emoji: event.emoji, added: event.added },
          transient: true,
        });
        break;
      }
      default:
        break;
    }
  }

  /** Terminal protocol error (auth/gate/dispatch failures surfaced pre-reply). */
  fail(errorText: string): void {
    if (this.ended) return;
    this.writeFrame({ type: 'error', errorText });
    this.end();
  }

  end(): void {
    if (this.ended) return;
    this.ended = true;

    this.clearTimer('firstEventTimer');
    this.clearTimer('settleTimer');
    this.clearTimer('idleTimer');
    this.clearTimer('maxTimer');

    if (!this.res.writableEnded) {
      try {
        this.writeRaw({ type: 'finish' });
        this.res.write('data: [DONE]\n\n');
        this.res.end();
      } catch {
        // Socket already gone — nothing to flush.
      }
    }

    this.resolveDone();
  }

  private writeMessageFrames(
    messageId: string,
    content: { markdown?: string; card?: unknown; files?: unknown[] },
    ts: number
  ): void {
    this.writeFrame({ type: 'data-message-start', data: { messageId, createdAt: new Date(ts).toISOString() } });

    if (content.markdown !== undefined) {
      this.writeFrame({ type: 'text-start', id: messageId });
      if (content.markdown.length > 0) {
        this.writeFrame({ type: 'text-delta', id: messageId, delta: content.markdown });
      }
      this.writeFrame({ type: 'text-end', id: messageId });
    }

    if (content.card !== undefined) {
      this.writeFrame({ type: 'data-card', id: messageId, data: { card: content.card } });
    }

    if (content.files?.length) {
      this.writeFrame({ type: 'data-files', id: messageId, data: { files: content.files } });
    }
  }

  /** Close soon after activity settles, unless the agent signalled more work via typing. */
  private armSettleTimer(): void {
    if (this.typingActive) return;
    this.clearTimer('settleTimer');
    this.settleTimer = setTimeout(() => this.end(), this.options.settleMs);
  }

  private armSettleTimerIfIdle(): void {
    if (this.messageCount > 0) {
      this.armSettleTimer();
    }
  }

  private armIdleTimer(): void {
    this.clearTimer('idleTimer');
    this.idleTimer = setTimeout(() => this.end(), this.options.idleTimeoutMs);
  }

  private clearTimer(name: 'firstEventTimer' | 'settleTimer' | 'idleTimer' | 'maxTimer'): void {
    const timer = this[name];
    if (timer) {
      clearTimeout(timer);
      this[name] = null;
    }
  }

  private writeFrame(frame: Record<string, unknown>): void {
    if (this.ended || this.res.writableEnded) return;
    this.writeRaw(frame);
  }

  private writeRaw(frame: Record<string, unknown>): void {
    this.res.write(`data: ${JSON.stringify(frame)}\n\n`);
  }
}
