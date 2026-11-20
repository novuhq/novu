import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';

export type RpcId = string | number;

/** The error a peer answered a request with. */
export class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string
  ) {
    super(message);
  }
}

/** What a request handler returns to leave a request unanswered: the peer took it back meanwhile. */
export const NO_ANSWER = Symbol('no answer');

export interface RpcHandlers {
  /** A request from the peer: what it resolves with is the result, and what it throws, the error. */
  request(method: string, params: unknown, id: RpcId): Promise<unknown>;
  notification(method: string, params: unknown): void;
}

type Incoming = {
  id?: RpcId;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code?: number; message?: string };
};

/** No such method, as JSON-RPC has it: what a peer hears for a request nothing here handles. */
export const METHOD_NOT_FOUND = -32601;

/**
 * JSON-RPC over a program's stdio, one message a line: requests both ways, their answers, and notifications.
 * `jsonrpc: true` writes `"jsonrpc": "2.0"` on each message, for a peer that wants it; Codex's app-server leaves
 * it out.
 */
export class RpcPeer {
  private next = 1;
  private readonly waiting = new Map<RpcId, { resolve: (result: unknown) => void; reject: (err: Error) => void }>();
  private closedWith?: string;

  constructor(
    input: Readable,
    private readonly output: Writable,
    private readonly handlers: RpcHandlers,
    private readonly options: { jsonrpc?: boolean } = {}
  ) {
    createInterface({ input }).on('line', (line) => this.read(line));
  }

  request<T>(method: string, params?: unknown): Promise<T> {
    if (this.closedWith) {
      return Promise.reject(new Error(this.closedWith));
    }

    const id = this.next++;

    return new Promise<T>((resolve, reject) => {
      this.waiting.set(id, { resolve: resolve as (result: unknown) => void, reject });
      this.write({ id, method, ...(params === undefined ? {} : { params }) });
    });
  }

  notify(method: string, params?: unknown): void {
    this.write({ method, ...(params === undefined ? {} : { params }) });
  }

  /** The peer is gone: every request still waiting fails with `reason`, and so does every one after. */
  close(reason: string): void {
    this.closedWith ??= reason;
    for (const { reject } of this.waiting.values()) {
      reject(new Error(reason));
    }
    this.waiting.clear();
  }

  private read(line: string): void {
    let message: Incoming;
    try {
      message = JSON.parse(line) as Incoming;
    } catch {
      return;
    }

    if (message.method !== undefined && message.id !== undefined) {
      void this.answer(message.id, message.method, message.params);
    } else if (message.method !== undefined) {
      this.handlers.notification(message.method, message.params);
    } else if (message.id !== undefined) {
      const waiting = this.waiting.get(message.id);
      this.waiting.delete(message.id);
      if (message.error) {
        waiting?.reject(new RpcError(message.error.code ?? 0, message.error.message ?? 'The request failed.'));
      } else {
        waiting?.resolve(message.result);
      }
    }
  }

  private async answer(id: RpcId, method: string, params: unknown): Promise<void> {
    try {
      const result = await this.handlers.request(method, params, id);
      if (result !== NO_ANSWER) {
        this.write({ id, result });
      }
    } catch (err) {
      this.write({
        id,
        error: {
          code: err instanceof RpcError ? err.code : -32603,
          message: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  private write(message: object): void {
    if (this.output.writable) {
      this.output.write(`${JSON.stringify(this.options.jsonrpc ? { jsonrpc: '2.0', ...message } : message)}\n`);
    }
  }
}
