import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface RecordedSendblueCall {
  path: string;
  payload: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
}

export interface SendblueApiStub {
  url: string;
  calls: RecordedSendblueCall[];
  reset(): void;
  close(): Promise<void>;
}

let stub: SendblueApiStub | undefined;

function buildResponse(path: string): Record<string, unknown> {
  if (path === '/api/send-message') {
    return {
      status: 'QUEUED',
      message_handle: `stub-handle-${Date.now()}`,
      date_sent: new Date().toISOString(),
    };
  }

  if (path === '/api/account/webhooks') {
    return { status: 'OK' };
  }

  return { status: 'OK' };
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Boots a minimal in-process Sendblue API stub and publishes its base URL via
 * `process.env.SENDBLUE_API_BASE_URL`, which the official `sendblue` SDK
 * (used internally by the vendor-official `chat-adapter-sendblue` package that
 * `@novu/chat-adapter-sendblue` wraps) reads as its base URL override. This
 * lets e2e tests drive the production Sendblue adapter (webhook verification,
 * replies via `send-message`, typing indicators) without the real Sendblue API.
 */
export async function startSendblueApiStub(): Promise<SendblueApiStub> {
  if (stub) return stub;

  const calls: RecordedSendblueCall[] = [];

  const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const path = (req.url ?? '').split('?')[0];
    const payload = await readJsonBody(req);
    calls.push({ path, payload, headers: req.headers });

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(buildResponse(path)));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  process.env.SENDBLUE_API_BASE_URL = url;

  stub = {
    url,
    calls,
    reset: () => {
      calls.length = 0;
    },
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      stub = undefined;
      delete process.env.SENDBLUE_API_BASE_URL;
    },
  };

  return stub;
}
