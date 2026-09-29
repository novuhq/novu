// Local bridge check without Novu: POSTs agent events to a running server (HMAC off, NODE_ENV unset) and
// captures what the framework emits on a local fake eventsUrl. Writes artifacts/smoke-bridge.json.
// Usage: npm start (other terminal), then: node scripts/smoke-bridge.ts [--bridge http://localhost:8080/api/novu]
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { bridge: { type: 'string', default: 'http://localhost:8080/api/novu' } } });
const AGENT_ID = 'discovery-agent';

type Envelope = { runId: string; turnId: string; event: { type: string; [key: string]: unknown } };
const received: Envelope[] = [];
const waiters: Array<() => void> = [];
const sink = createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    received.push(...(JSON.parse(body) as { events: Envelope[] }).events);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
    waiters.splice(0).forEach((wake) => wake());
  });
});
await new Promise<void>((resolve) => sink.listen(0, resolve));
const eventsUrl = `http://localhost:${(sink.address() as AddressInfo).port}/v1/agents/events/ingest`;

let metadata: Record<string, unknown> = {};
const turns: unknown[] = [];

async function turn(name: string, event: 'onMessage' | 'onAction', extra: Record<string, unknown>) {
  const deliveryId = `del-${name}`;
  const now = new Date().toISOString();
  const body = {
    version: 1,
    timestamp: now,
    deliveryId,
    event,
    agentId: AGENT_ID,
    replyUrl: 'http://unused',
    eventsUrl,
    conversationId: 'conv-smoke',
    integrationIdentifier: 'smoke',
    action: null,
    message: null,
    reaction: null,
    conversation: { identifier: 'conv-smoke', status: 'active', metadata, messageCount: turns.length + 1, createdAt: now, lastActivityAt: now },
    subscriber: { subscriberId: 'smoke-user' },
    history: [],
    platform: 'slack',
    platformContext: { threadId: 't1', channelId: 'c1', isDM: true },
    ...extra,
  };
  const started = Date.now();
  const res = await fetch(`${values.bridge}?action=agent-event&agentId=${AGENT_ID}&event=${event}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const ack = { status: res.status, body: await res.text(), ms: Date.now() - started };

  const done = () => received.some((e) => e.turnId === deliveryId && (e.event.type === 'run-finish' || e.event.type === 'run-error'));
  while (!done()) await new Promise<void>((resolve) => waiters.push(resolve));
  const events = received.filter((e) => e.turnId === deliveryId).map((e) => e.event);

  for (const e of events) {
    const signal = e.signal as { type: string; action?: string; key?: string; value?: unknown } | undefined;
    if (e.type === 'signal' && signal?.type === 'metadata' && signal.action === 'set') metadata = { ...metadata, [signal.key!]: signal.value };
  }
  const summary = events.map((e) => {
    if (e.type === 'message') return { type: 'message', content: e.content };
    if (e.type === 'signal') {
      const signal = e.signal as Record<string, unknown>;
      return signal.type === 'human' ? { type: 'human', kind: signal.kind, requestId: signal.requestId, card: signal.card } : { type: 'metadata', key: signal.key };
    }
    return { type: e.type, ...(e.type === 'channel.typing' ? { state: e.state, status: e.status } : {}) };
  });
  turns.push({ name, event, input: extra, ack, totalMs: Date.now() - started, events: summary, routeAfter: metadata.route });
  console.log(`\n== ${name}: ack ${ack.status} ${ack.body} in ${ack.ms} ms, turn done in ${Date.now() - started} ms`);
  for (const s of summary) console.log('  ', JSON.stringify(s).slice(0, 400));
  console.log('   route:', JSON.stringify(metadata.route));

  return events;
}

const msg = (text: string) => ({ message: { text, platformMessageId: `m-${Date.now()}`, author: { userId: 'u1', fullName: 'Smoke', userName: 'smoke', isBot: false }, timestamp: new Date().toISOString() } });

await turn('t1-sales', 'onMessage', msg('What were our sales?'));
await turn('t2-month', 'onMessage', msg('March'));
await turn('t3-hi', 'onMessage', msg('hi, what can you do?'));
await turn('t4-ambiguous', 'onMessage', msg('Summarise last quarter.'));
const pending = (metadata.route as { pending?: { requestId: string } } | undefined)?.pending;
if (pending) {
  await turn('t5-pick-a1', 'onAction', { action: { id: 'pick_agent', value: `${pending.requestId}:a1` } });
}
await turn('t6-change-agent', 'onAction', { action: { id: 'change_agent' } });

mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/smoke-bridge.json', `${JSON.stringify({ ranAt: new Date().toISOString(), bridge: values.bridge, turns }, null, 2)}\n`);
console.log('\nwrote artifacts/smoke-bridge.json');
sink.close();
