import type { AgentEventEnvelope } from '@novu/agent-event-protocol';

/** Proxies and load balancers close connections that stay silent for about a minute. */
const HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * Server-Sent Events body of a bridge response that carries a turn's reply text while it is written.
 * Writes never block the turn, and are dropped once Novu stops reading.
 */
export class AgentLiveStream {
  readonly body: ReadableStream<Uint8Array>;
  private controller?: ReadableStreamDefaultController<Uint8Array>;
  private closed = false;
  private heartbeat?: ReturnType<typeof setInterval>;
  private readonly encoder = new TextEncoder();

  constructor() {
    this.body = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
        // Novu times out a bridge whose headers have not arrived, and some hosts send them with the first chunk.
        this.send(': open\n\n');
        this.heartbeat = setInterval(() => this.send(': ping\n\n'), HEARTBEAT_INTERVAL_MS);
      },
      cancel: () => {
        this.closed = true;
        clearInterval(this.heartbeat);
      },
    });
  }

  write(envelope: AgentEventEnvelope): void {
    this.send(`data: ${JSON.stringify(envelope)}\n\n`);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.heartbeat);
    this.controller?.close();
  }

  private send(frame: string): void {
    if (this.closed) return;
    this.controller?.enqueue(this.encoder.encode(frame));
  }
}
