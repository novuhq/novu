// End-to-end: plays Gemini Enterprise against a running Novu API whose Gemini Enterprise channel forwards
// to this Discovery Agent's bridge. Real calls throughout (Novu API, bridge, Gemini, the A2A test agent).
// Writes artifacts/e2e-novu-channel.json.
//
//   NOVU_API_URL=http://127.0.0.1:3000 NOVU_SECRET_KEY=... BRIDGE_URL=http://127.0.0.1:4111/api/novu \
//     node scripts/e2e-novu-channel.ts
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const API = process.env.NOVU_API_URL ?? 'http://127.0.0.1:3000';
const KEY = process.env.NOVU_SECRET_KEY;
const BRIDGE_URL = process.env.BRIDGE_URL ?? 'http://127.0.0.1:4111/api/novu';
const AGENT = 'discovery-agent';
const A2UI_MIME = 'application/json+a2ui';
const TURN_TIMEOUT_MS = 180_000;
if (!KEY) throw new Error('NOVU_SECRET_KEY is required');

type Frame = Record<string, any>;
type Turn = {
  name: string;
  input: string;
  contextIdSent: string | null;
  status: number;
  ms: number;
  keepAlives: number;
  frames: Frame[];
  contextId?: string;
  finalState?: string;
  texts: string[];
  buttons: Array<{ id: string; label: string; event: Record<string, any>; surfaceId: string }>;
};

async function novu(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `ApiKey ${KEY}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as any;

  return { status: res.status, data: json?.data ?? json };
}

async function setup(): Promise<string> {
  const existing = await novu('GET', `/v1/agents/${AGENT}`);
  if (existing.status === 404) {
    const created = await novu('POST', '/v1/agents', {
      name: 'Discovery Agent',
      identifier: AGENT,
      description: 'Routes each question to the best Gemini Enterprise agent.',
    });
    if (created.status >= 300) throw new Error(`create agent ${created.status}: ${JSON.stringify(created.data)}`);
  }
  // GE users are not Novu subscribers; open access lets the bridge reply to them.
  const patched = await novu('PATCH', `/v1/agents/${AGENT}`, {
    bridgeUrl: BRIDGE_URL,
    behavior: { subscriberAccess: 'open' },
  });
  if (patched.status >= 300) throw new Error(`set bridgeUrl ${patched.status}: ${JSON.stringify(patched.data)}`);

  const linked = await novu('POST', `/v1/agents/${AGENT}/integrations`, { providerId: 'gemini-enterprise' });
  if (linked.status >= 300) throw new Error(`provision ${linked.status}: ${JSON.stringify(linked.data)}`);
  const integrationIdentifier = linked.data?.integration?.identifier;

  const card = await novu('GET', `/v1/agents/${AGENT}/integrations/${integrationIdentifier}/gemini-enterprise/agent-card`);
  if (card.status >= 300) throw new Error(`agent card ${card.status}: ${JSON.stringify(card.data)}`);
  cardSummary = { name: card.data.name, extensions: card.data.capabilities?.extensions?.map((e: any) => e.uri), integrationIdentifier };

  return card.data.url as string;
}

let cardSummary: Record<string, unknown> = {};

function textPart(text: string) {
  return { kind: 'text', text, metadata: { is_user_input: true } };
}

async function send(url: string, name: string, contextId: string | null, parts: unknown[], input: string): Promise<Turn> {
  const started = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: '*/*, text/event-stream' },
    signal: AbortSignal.timeout(TURN_TIMEOUT_MS),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: randomUUID(),
      method: 'message/stream',
      params: {
        message: { kind: 'message', role: 'user', messageId: randomUUID(), ...(contextId ? { contextId } : {}), parts },
        metadata: { 'X-A2A-Extensions': 'https://a2ui.org/a2a-extension/a2ui/v0.9' },
        configuration: { blocking: true, acceptedOutputModes: [] },
      },
    }),
  });
  const turn: Turn = { name, input, contextIdSent: contextId, status: res.status, ms: 0, keepAlives: 0, frames: [], texts: [], buttons: [] };
  const decoder = new TextDecoder();
  let buffer = '';

  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      if (block.startsWith(':')) turn.keepAlives += 1;
      else if (block.startsWith('data: ')) turn.frames.push(JSON.parse(block.slice(6)).result);
    }
  }
  turn.ms = Date.now() - started;

  const final = turn.frames.at(-1);
  turn.contextId = turn.frames[0]?.contextId;
  turn.finalState = final?.final ? final.status?.state : undefined;
  for (const part of final?.status?.message?.parts ?? []) {
    if (part.kind === 'text') turn.texts.push(part.text);
    const update = part.kind === 'data' && part.metadata?.mimeType === A2UI_MIME ? part.data?.updateComponents : undefined;
    if (!update) continue;
    const byId = new Map<string, any>(update.components.map((c: any) => [c.id, c]));
    const labels = new Set(update.components.filter((c: any) => c.component === 'Button').map((c: any) => c.child));
    for (const c of update.components) {
      if (c.component === 'Text' && !labels.has(c.id)) turn.texts.push(c.text);
      if (c.component === 'Button') {
        turn.buttons.push({ id: c.id, label: byId.get(c.child)?.text, event: c.action.event, surfaceId: update.surfaceId });
      }
    }
  }
  console.log(`[${name}] ${res.status} ${turn.ms} ms, ${turn.frames.length} frames, final=${turn.finalState}, texts=${JSON.stringify(turn.texts).slice(0, 300)}, buttons=${turn.buttons.map((b) => b.label).join('|')}`);

  return turn;
}

const checks: Array<{ check: string; pass: boolean; detail?: unknown }> = [];
const check = (name: string, pass: boolean, detail?: unknown) => {
  checks.push({ check: name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'} ${name}`);
};

const url = await setup();
const turns: Turn[] = [];
// Spaces turns out so the Discovery Agent's Gemini calls stay under the Vertex per-minute quota.
const PAUSE_MS = Number(process.env.PAUSE_MS ?? 8000);
const run = async (...args: Parameters<typeof send>) => {
  if (turns.length) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  const turn = await send(...args);
  turns.push(turn);

  return turn;
};

// Negative paths first: they must not create conversations.
const badSecret = await fetch(url.replace(/[^/]+$/, 'wrong-secret'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
check('wrong secret -> 404', badSecret.status === 404, badSecret.status);
const sendMethod = (await (await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'message/send' }) })).json()) as any;
check('message/send -> JSON-RPC -32601', sendMethod?.error?.code === -32601, sendMethod);

const t1 = await run(url, 'direct', null, [textPart('hi, what can you do?')], 'hi, what can you do?');
const ctx = t1.contextId ?? null;
check('first turn: task frame mints a contextId', typeof ctx === 'string' && t1.frames[0]?.kind === 'task');
check('first turn: closes completed with an answer', t1.finalState === 'completed' && t1.texts.join('').length > 20, t1.texts);

const t2 = await run(url, 'forward-sales', ctx, [textPart('What were our sales?')], 'What were our sales?');
check('forward: same contextId echoed', t2.contextId === ctx);
check('forward: sales agent asks which month', t2.finalState === 'completed' && /month/i.test(t2.texts.join(' ')), t2.texts);

const t3 = await run(url, 'forward-followup', ctx, [textPart('March')], 'March');
check('follow-up: sales agent answers for March', t3.finalState === 'completed' && /march/i.test(t3.texts.join(' ')), t3.texts);

const t4 = await run(url, 'choose-card', ctx, [textPart('Summarise last quarter.')], 'Summarise last quarter.');
check('ambiguous: choice card rendered as A2UI buttons', t4.finalState === 'completed' && t4.buttons.length >= 2, t4.buttons.map((b) => b.label));

const pick = t4.buttons.find((b) => /sales|test agent/i.test(b.label ?? '')) ?? t4.buttons[0];
if (pick) {
  const click = {
    kind: 'data',
    metadata: { is_user_input: true, mimeType: A2UI_MIME },
    data: { version: 'v0.9', action: { ...pick.event, surfaceId: pick.surfaceId, sourceComponentId: pick.id, timestamp: new Date().toISOString() } },
  };
  const t5 = await run(url, 'click', ctx, [textPart('User action triggered.'), click], `[click ${pick.label}]`);
  check('click: routed to the picked agent and answered', t5.finalState === 'completed' && t5.texts.join('').length > 10, t5.texts);
}

// Supersede: a newer message on the same context closes the older held stream.
const older = run(url, 'superseded-older', ctx, [textPart('What were our sales in April?')], 'What were our sales in April?');
await new Promise((resolve) => setTimeout(resolve, 400));
const newer = run(url, 'superseded-newer', ctx, [textPart('hi again')], 'hi again');
const [t6, t7] = await Promise.all([older, newer]);
check('supersede: older stream closes with the stop notice', t6.texts.some((t) => t.includes('Stopped')), t6.texts);
check('supersede: newer stream still answers', t7.finalState === 'completed' && t7.texts.length > 0, t7.texts);

mkdirSync('artifacts', { recursive: true });
writeFileSync(
  'artifacts/e2e-novu-channel.json',
  JSON.stringify({ at: new Date().toISOString(), api: API, agentCard: cardSummary, checks, turns }, null, 2)
);
const failed = checks.filter((c) => !c.pass).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed. Artifact: artifacts/e2e-novu-channel.json`);
process.exit(failed ? 1 : 0);
