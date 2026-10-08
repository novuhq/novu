#!/usr/bin/env node
// Catches what Novu sends over SMS, push and chat, and shows it in Mailpit next to the emails.
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

const PORT = Number(process.env.SINK_PORT ?? 8026);
const MAILPIT = process.env.SINK_MAILPIT_URL ?? 'http://127.0.0.1:8025';

const channels = {
  sms: (body) => ({
    to: `phone-${String(body.to ?? 'unknown').replace(/[^0-9A-Za-z]/g, '')}@sms.box.local`,
    subject: `SMS to ${body.to}`,
    text: body.content,
  }),
  push: (body) => ({
    to: 'push@push.box.local',
    subject: `Push: ${body.title ?? '(no title)'}`,
    text: `${body.title ?? ''}\n${body.content ?? ''}\n\nDevice tokens: ${[].concat(body.target ?? []).join(', ')}`,
  }),
  chat: (body) => ({
    to: 'chat@chat.box.local',
    subject: `Chat: ${String(body.content ?? '').slice(0, 80)}`,
    text: body.content,
  }),
};

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;

  return raw;
}

const server = http.createServer(async (req, res) => {
  const channel = req.url.split('?')[0].replace(/^\//, '');
  const toMessage = channels[channel];
  if (req.method === 'GET' && req.url === '/health') return res.end('ok');
  if (req.method !== 'POST' || !toMessage) {
    res.writeHead(404).end();

    return;
  }

  const raw = await readBody(req);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    body = { raw };
  }
  const message = toMessage(body);
  const headers = Object.fromEntries(Object.entries(req.headers).filter(([key]) => !['host', 'content-length', 'connection'].includes(key)));
  const text = `${message.text ?? ''}\n\n--- request Novu sent to the ${channel} provider ---\n${JSON.stringify({ headers, body }, null, 2)}\n`;

  const sent = await fetch(`${MAILPIT}/api/v1/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      From: { Email: `${channel}@novu-box.local`, Name: `Novu ${channel.toUpperCase()}` },
      To: [{ Email: message.to }],
      Subject: message.subject,
      Text: text,
      Tags: [channel],
    }),
  }).catch((error) => ({ ok: false, statusText: error.message }));

  if (!sent.ok) {
    console.error(`${channel}: Mailpit send failed: ${sent.status ?? ''} ${sent.statusText}`);
    res.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'mailpit send failed' }));

    return;
  }
  const { ID } = await sent.json();
  console.log(`${channel}: ${message.subject} -> mailpit ${ID}`);
  res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: ID, date: new Date().toISOString() }));
});

server.listen(PORT, '127.0.0.1', () => console.log(`sink listening on 127.0.0.1:${PORT}`));
