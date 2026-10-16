// Catches what Novu sends over SMS, push and chat, and shows it in Mailpit next to the emails (process-compose's
// `sink`: `node /opt/box/src/box/sink.ts`).
//
// The box seeds Novu's HTTP providers (generic-sms, push-webhook, chat-webhook) with this server as their
// URL, so a message here is exactly what the worker handed to the provider: rendered content, recipient,
// payload and signature. Provider-specific adapters (Twilio, FCM, Slack, ...) are not exercised.
//
//   POST /sms   generic-sms body: { to, content, sender, ... }
//   POST /push  push-webhook body: { target, title, content, payload, ... } + X-Novu-Signature
//   POST /chat  chat-webhook body: { content, webhookUrl, ... } + X-Novu-Signature
//
// Replies { id, date } like a provider; a Mailpit failure becomes a 502 so the Novu step fails too.

import http from 'node:http';
import { text } from 'node:stream/consumers';
import { fetchJson } from '../node/http.ts';
import { fromJson, MailpitSent, ProviderRequest } from '../shared/contracts.ts';

const PORT = Number(process.env.SINK_PORT ?? 8026);
const MAILPIT = process.env.SINK_MAILPIT_URL ?? 'http://127.0.0.1:8025/mail';

type Body = Record<string, unknown>;
interface Message {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

const str = (value: unknown) => (value === undefined || value === null ? '' : String(value));

const channels: Record<string, (body: Body) => Message> = {
  sms: (body) => ({
    to: `phone-${str(body.to ?? 'unknown').replace(/[^0-9A-Za-z]/g, '')}@sms.box.local`,
    subject: `SMS to ${body.to}`,
    text: str(body.content),
  }),
  push: (body) => ({
    to: 'push@push.box.local',
    subject: `Push: ${body.title ?? '(no title)'}`,
    text: `${str(body.title)}\n${str(body.content)}\n\nDevice tokens: ${[body.target ?? []].flat().join(', ')}`,
  }),
  chat: (body) => ({
    to: 'chat@chat.box.local',
    subject: `Chat: ${str(body.content).slice(0, 80)}`,
    text: str(body.content),
  }),
};

async function catchMessage(
  channel: string,
  toMessage: (body: Body) => Message,
  request: http.IncomingMessage
): Promise<[number, object]> {
  const raw = await text(request);
  const body = fromJson(ProviderRequest).safeParse(raw).data ?? { raw };
  const message = toMessage(body);
  const headers = Object.fromEntries(
    Object.entries(request.headers).filter(([key]) => !['host', 'content-length', 'connection'].includes(key))
  );
  const sent = JSON.stringify({ headers, body }, null, 2);
  try {
    const { ID } = await fetchJson(`${MAILPIT}/api/v1/send`, MailpitSent, {
      method: 'POST',
      json: {
        From: { Email: `${channel}@novu-box.local`, Name: `Novu ${channel.toUpperCase()}` },
        To: [{ Email: message.to }],
        Subject: message.subject,
        Text: `${message.text}\n\n--- request Novu sent to the ${channel} provider ---\n${sent}\n`,
        Tags: [channel],
      },
    });
    console.log(`${channel}: ${message.subject} -> mailpit ${ID}`);

    return [200, { id: ID, date: new Date().toISOString() }];
  } catch (error) {
    console.error(`${channel}: Mailpit send failed: ${error instanceof Error ? error.message : error}`);

    return [502, { error: 'mailpit send failed' }];
  }
}

http
  .createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://sink').pathname;
    if (request.method === 'GET' && path === '/health') return response.end('ok');
    const channel = path.slice(1);
    const toMessage = request.method === 'POST' ? channels[channel] : undefined;
    if (!toMessage) return response.writeHead(404).end();
    const [status, body] = await catchMessage(channel, toMessage, request);
    response.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
  })
  .listen(PORT, '127.0.0.1');
