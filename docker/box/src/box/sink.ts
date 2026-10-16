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
import * as NodeHttpServer from '@effect/platform-node/NodeHttpServer';
import * as NodeRuntime from '@effect/platform-node/NodeRuntime';
import { Effect, Layer } from 'effect';
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/http';

const PORT = Number(process.env.SINK_PORT ?? 8026);
const MAILPIT = process.env.SINK_MAILPIT_URL ?? 'http://127.0.0.1:8025/mail';

// biome-ignore lint/suspicious/noExplicitAny: whatever a Novu provider sent
type Body = any;
type Sent = { readonly ok: true; readonly id: string } | { readonly ok: false; readonly why: string };
interface Message {
  readonly to: string;
  readonly subject: string;
  readonly text: string | undefined;
}

const channels: Record<string, (body: Body) => Message> = {
  sms: (body) => ({
    to: `phone-${String(body.to ?? 'unknown').replace(/[^0-9A-Za-z]/g, '')}@sms.box.local`,
    subject: `SMS to ${body.to}`,
    text: body.content,
  }),
  push: (body) => ({
    to: 'push@push.box.local',
    subject: `Push: ${body.title ?? '(no title)'}`,
    text: `${body.title ?? ''}\n${body.content ?? ''}\n\nDevice tokens: ${([] as Array<string>).concat(body.target ?? []).join(', ')}`,
  }),
  chat: (body) => ({
    to: 'chat@chat.box.local',
    subject: `Chat: ${String(body.content ?? '').slice(0, 80)}`,
    text: body.content,
  }),
};

const catchMessage = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const { channel = '' } = yield* HttpRouter.params;
  const toMessage = channels[channel];
  if (!toMessage) return HttpServerResponse.empty({ status: 404 });
  const raw = yield* Effect.orElseSucceed(request.text, () => '');
  let body: Body;
  try {
    body = JSON.parse(raw);
  } catch {
    body = { raw };
  }
  const message = toMessage(body);
  const headers = Object.fromEntries(
    Object.entries(request.headers).filter(([key]) => !['host', 'content-length', 'connection'].includes(key))
  );
  const text = `${message.text ?? ''}\n\n--- request Novu sent to the ${channel} provider ---\n${JSON.stringify({ headers, body }, null, 2)}\n`;

  const send = Effect.gen(function* () {
    const response = yield* HttpClient.execute(
      HttpClientRequest.post(`${MAILPIT}/api/v1/send`).pipe(
        HttpClientRequest.bodyJsonUnsafe({
          From: { Email: `${channel}@novu-box.local`, Name: `Novu ${channel.toUpperCase()}` },
          To: [{ Email: message.to }],
          Subject: message.subject,
          Text: text,
          Tags: [channel],
        })
      )
    );
    if (response.status < 200 || response.status >= 300) return { ok: false, why: `${response.status}` } as Sent;
    const { ID } = (yield* response.json) as { ID: string };

    return { ok: true, id: ID } as Sent;
  });
  const sent = yield* send.pipe(
    Effect.catch((error) => Effect.succeed<Sent>({ ok: false, why: error.message })),
    Effect.provide(FetchHttpClient.layer)
  );

  if (!sent.ok) {
    console.error(`${channel}: Mailpit send failed: ${sent.why}`);

    return HttpServerResponse.jsonUnsafe({ error: 'mailpit send failed' }, { status: 502 });
  }
  console.log(`${channel}: ${message.subject} -> mailpit ${sent.id}`);

  return HttpServerResponse.jsonUnsafe({ id: sent.id, date: new Date().toISOString() });
});

const Routes = Layer.mergeAll(
  HttpRouter.add('GET', '/health', HttpServerResponse.text('ok')),
  HttpRouter.add('POST', '/:channel', catchMessage)
);

HttpRouter.serve(Routes, { disableLogger: true }).pipe(
  Layer.provide(NodeHttpServer.layer(() => http.createServer(), { port: PORT, host: '127.0.0.1' })),
  Layer.launch,
  NodeRuntime.runMain
);
