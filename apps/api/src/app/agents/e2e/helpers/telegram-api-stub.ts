import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface RecordedTelegramCall {
  method: string;
  payload: Record<string, unknown>;
}

export interface TelegramApiStub {
  url: string;
  calls: RecordedTelegramCall[];
  reset(): void;
  close(): Promise<void>;
}

let stub: TelegramApiStub | undefined;

const TELEGRAM_METHOD_PATTERN = /^\/bot[^/]+\/(\w+)$/;

function buildResponse(method: string, payload: Record<string, unknown>): Record<string, unknown> {
  switch (method) {
    case 'getMe':
      return {
        ok: true,
        result: { id: 999_000_001, is_bot: true, first_name: 'E2E Bot', username: 'novu_e2e_bot' },
      };
    case 'sendMessage':
      return {
        ok: true,
        result: {
          message_id: Math.floor(Math.random() * 1_000_000) + 1,
          chat: { id: payload.chat_id, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: payload.text ?? '',
        },
      };
    case 'getWebhookInfo':
      return { ok: true, result: { url: 'https://stub.invalid/webhook' } };
    default:
      return { ok: true, result: {} };
  }
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
 * Boots a minimal in-process Telegram Bot API stub and publishes its base URL
 * via `process.env.TELEGRAM_API_BASE_URL`, which `@chat-adapter/telegram`
 * reads at adapter construction. This lets e2e tests drive the production
 * Telegram adapter (webhook parsing, `/start` command routing, replies via
 * `sendMessage`) without the real Telegram API.
 */
export async function startTelegramApiStub(): Promise<TelegramApiStub> {
  if (stub) return stub;

  const calls: RecordedTelegramCall[] = [];

  const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const match = TELEGRAM_METHOD_PATTERN.exec(req.url ?? '');
    if (!match) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, description: `Unknown path ${req.url}` }));

      return;
    }

    const method = match[1];
    const payload = await readJsonBody(req);
    calls.push({ method, payload });

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(buildResponse(method, payload)));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  process.env.TELEGRAM_API_BASE_URL = url;

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
      delete process.env.TELEGRAM_API_BASE_URL;
    },
  };

  return stub;
}
