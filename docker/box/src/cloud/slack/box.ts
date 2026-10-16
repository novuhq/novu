// A box's side of the Slack router (router.ts): what Box (box.ts) does for Novu Bot. Box calls it at its Slack
// hooks: `resetSlack` when the container starts, `connectSlack` on each alarm, `unregisterSlack` when the box is
// deleted, `slackEnv` for the box's environment, `slackState` for /__box/state, and `slackEvent` when the router hands
// the box an event. Without the router's settings (SLACK_ROUTER_URL) every hook does nothing, and boxes get no Slack.

import * as z from 'zod';
import { fromJson, type Phase } from '../../shared/contracts.ts';
import { boxOfOrigin } from '../../shared/names.ts';
import { CALL_MS, messageOf, withTimeout } from '../container.ts';
import type { HostEnv } from '../env.ts';
import type { SlackAgent, SlackAnswer, SlackEvent, SlackEventNote } from './types.ts';

// Prints the API key and the agents the bridge app serves now, signed as `box` signs discover. An agent the bridge
// no longer serves keeps its bridge URL in the API, so the API's list can't tell.
const DISCOVER = `
const key = require('fs').readFileSync('/data/bridge/secret-key', 'utf8').trim();
const t = Date.now();
const v1 = require('crypto').createHmac('sha256', key).update(t + '.{}').digest('hex');
fetch('http://127.0.0.1:4000/api/novu?action=discover', {
  headers: { 'novu-signature': 't=' + t + ',v1=' + v1 },
  signal: AbortSignal.timeout(20000),
})
  .then((response) => response.json())
  .then(({ agents = [] }) => console.log(JSON.stringify({ key, served: agents.map((agent) => agent.agentId) })));
`;
const Discovered = fromJson(z.object({ key: z.string(), served: z.array(z.string()) }));
const WithIds = z.object({ data: z.array(z.object({ identifier: z.string(), _id: z.string() })) });
const Connections = z.object({ data: z.array(z.object({ identifier: z.string() })) });

// What the Slack part needs from its Box, and what it remembers while the container runs.
export interface SlackBox {
  readonly storage: DurableObjectStorage;
  readonly env: HostEnv;
  readonly running: () => boolean;
  readonly phase: () => Promise<Phase>;
  readonly wake: (origin: string) => Promise<void>;
  readonly output: (cmd: ReadonlyArray<string>, what: string) => Promise<string>;
  readonly port: () => Fetcher;
  readonly touch: () => void;
  linked: Set<string>;
  apiKey: string | null;
}

interface ApiInit {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  readonly body?: object;
}

const enabled = (box: SlackBox) => Boolean(box.env.SLACK_ROUTER_URL);
const router = (box: SlackBox) => box.env.ROUTER.get(box.env.ROUTER.idFromName('router'));

// SLACK_API_URL sends the box's Slack calls to the router, which swaps its fake tokens for the real one.
export function slackEnv(box: SlackBox): Record<string, string> {
  return enabled(box) ? { SLACK_API_URL: `${box.env.SLACK_ROUTER_URL}/api/` } : {};
}

// The last Slack events the router handed to the box's agents, newest last.
export async function slackState(box: SlackBox): Promise<{ slackEvents: ReadonlyArray<SlackEventNote> }> {
  return { slackEvents: (await box.storage.get<Array<SlackEventNote>>('slackEvents')) ?? [] };
}

export async function resetSlack(box: SlackBox): Promise<void> {
  await box.storage.delete('slackConnected');
  box.linked = new Set();
  box.apiKey = null;
}

export async function unregisterSlack(box: SlackBox): Promise<void> {
  const origin = await box.storage.get<string>('origin');
  if (!enabled(box) || !origin) return;
  await router(box)
    .unregister(boxOfOrigin(origin))
    .catch((error: unknown) => console.log(`slack: ${messageOf(error)}`));
}

// When the box is up, and again when the agents its bridge serves change (an apply): every one of them gets a
// Slack integration, linked to it, with the signing secret and a bot token the router minted for this box, and a
// workspace connection for Novu Bot's workspace. Then the router posts (or refreshes) the box's ready message in
// #novu-box. It goes through the box's API from here, not from the box's own commands, because a box keeps the
// commands of the snapshot it started from. A box started from another box's snapshot has that box's credentials
// until this replaces them.
export async function connectSlack(box: SlackBox): Promise<void> {
  if (!enabled(box)) return;
  const origin = await box.storage.get<string>('origin');
  const output = await box.output(['sh', '-c', 'test -f /data/.baked.json && node -e "$0"', DISCOVER], 'discover');
  if (!origin || !output) return;
  const { key, served } = Discovered.parse(output);
  box.apiKey = key;
  const name = boxOfOrigin(origin);
  // In storage: the Durable Object doesn't stay in memory between alarms.
  if (!served.length || [...served].sort().join(',') === (await box.storage.get<string>('slackConnected'))) return;
  // An agent the bridge serves may not be in the API yet (a sync creates it); the next alarm connects it.
  const agents = (await list(box, origin, '/v1/agents?limit=50', WithIds)).filter((agent) =>
    served.includes(agent.identifier)
  );
  const slack = await router(box)
    .register(
      name,
      origin,
      agents.map((agent) => agent.identifier)
    )
    .catch((error: unknown) => Promise.reject(new Error(`register: ${messageOf(error)}`)));
  const integrations = await list(box, origin, '/v1/integrations', WithIds);
  const ready: Array<SlackAgent> = [];
  for (const agent of agents) {
    const identifier = `box-slack-${agent.identifier}`;
    const credentials = { signingSecret: slack.signingSecret };
    const integration = integrations.find((item) => item.identifier === identifier);
    if (integration)
      await api(box, origin, `/v1/integrations/${integration._id}`, {
        method: 'PUT',
        body: { credentials, check: false },
      });
    else
      await api(box, origin, '/v1/integrations', {
        method: 'POST',
        body: {
          providerId: 'slack',
          channel: 'chat',
          name: `Slack via the Novu Box router (${agent.identifier})`,
          identifier,
          active: true,
          check: false,
          credentials,
        },
      });
    await api(box, origin, `/v1/agents/${agent.identifier}/integrations`, {
      method: 'POST',
      body: { integrationIdentifier: identifier },
    });
    const connection = {
      workspace: { id: slack.team.id, name: slack.team.name, botUserId: slack.botUserId },
      auth: { accessToken: slack.tokens[agent.identifier] },
    };
    const [existing] = await list(
      box,
      origin,
      `/v1/channel-connections?integrationIdentifier=${identifier}`,
      Connections
    );
    if (existing)
      await api(box, origin, `/v1/channel-connections/${existing.identifier}`, { method: 'PATCH', body: connection });
    else
      await api(box, origin, '/v1/channel-connections', {
        method: 'POST',
        body: {
          identifier,
          integrationIdentifier: identifier,
          connectionMode: 'shared',
          context: { 'novu-box': 'slack' },
          ...connection,
        },
      });
    ready.push({ identifier: agent.identifier, id: agent._id, integrationIdentifier: identifier });
  }
  await router(box)
    .ready(name, ready)
    .catch((error: unknown) => Promise.reject(new Error(`ready: ${messageOf(error)}`)));
  const connected = ready
    .map((agent) => agent.identifier)
    .sort()
    .join(',');
  await box.storage.put('slackConnected', connected);
  console.log(`slack: ${name} connected ${connected}`);
}

// The Slack router hands the box an event for one of its agents, signed with the box's secret, and gets the
// agent's answer; null while the box is asleep (this wakes it), starting or saving, and the router tries again.
// The bridge agents answer only people linked to a subscriber (subscriberAccess `restricted`), so a person's first
// event links them to subscriber slack-<user> in the box, as a customer's app does with <ConnectChat>.
export async function slackEvent(box: SlackBox, event: SlackEvent): Promise<SlackAnswer | null> {
  box.touch();
  const origin = (await box.storage.get<string>('origin')) ?? '';
  const phase = await box.phase();
  if (phase === 'saving') return null;
  if (!box.running()) {
    if (phase === 'asleep') await box.wake(origin);

    return null;
  }
  try {
    return await deliver(box, origin, event);
  } catch (error) {
    console.log(`slack: ${event.agent.identifier} isn't answering yet: ${messageOf(error)}`);

    return null;
  }
}

async function deliver(box: SlackBox, origin: string, event: SlackEvent): Promise<SlackAnswer | null> {
  const { id, agent, user, headers, body, timeoutMs } = event;
  const integrationIdentifier = agent.integrationIdentifier;
  if (user && !box.linked.has(`${integrationIdentifier}:${user}`)) {
    await api(box, origin, '/v1/channel-endpoints', {
      method: 'POST',
      body: {
        identifier: `${integrationIdentifier}-${user}`,
        subscriberId: `slack-${user}`,
        createSubscriberIfMissing: true,
        integrationIdentifier,
        connectionIdentifier: integrationIdentifier,
        type: 'slack_user',
        endpoint: { userId: user },
      },
    });
    box.linked.add(`${integrationIdentifier}:${user}`);
  }
  const webhook = `${insideOrigin(origin)}/v1/agents/${agent.id}/webhook/${integrationIdentifier}`;
  const response = await box.port().fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
    ...(timeoutMs && { signal: AbortSignal.timeout(timeoutMs) }),
  });
  // From the box's proxy while the API restarts.
  if (response.status === 502 || response.status === 504) return null;
  const answer: SlackAnswer = {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get('content-type') ?? 'application/json',
    text: await response.text(),
  };
  const events = (await box.storage.get<Array<SlackEventNote>>('slackEvents')) ?? [];
  events.push({ id, agent: agent.identifier, user, status: answer.status, at: new Date().toISOString() });
  await box.storage.put('slackEvents', events.slice(-20));

  return answer;
}

// The box's own API over its port, with the environment's secret key. 409 counts as done: the thing exists.
async function api(box: SlackBox, origin: string, path: string, init: ApiInit = {}): Promise<string> {
  const method = init.method ?? 'GET';
  box.apiKey ||= await box.output(['cat', '/data/bridge/secret-key'], 'reading the API key');
  const call = async () => {
    const response = await box.port().fetch(`${insideOrigin(origin)}${path}`, {
      method,
      headers: { Authorization: `ApiKey ${box.apiKey}`, ...(init.body && { 'Content-Type': 'application/json' }) },
      ...(init.body && { body: JSON.stringify(init.body) }),
    });
    const text = await response.text();
    if (response.status >= 300 && response.status !== 409)
      throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 200)}`);

    return text;
  };

  return withTimeout(call(), CALL_MS, `${method} ${path}`);
}

async function list<T extends { identifier: string }>(
  box: SlackBox,
  origin: string,
  path: string,
  schema: z.ZodType<{ data: Array<T> }>
): Promise<Array<T>> {
  const answer = fromJson(schema).safeParse(await api(box, origin, path));
  if (!answer.success) throw new Error(`GET ${path}: ${z.prettifyError(answer.error)}`);

  return answer.data.data;
}

// The port speaks plain HTTP; the host stays the public one, which the API's URLs and Clerk check.
function insideOrigin(origin: string): string {
  return origin.replace(/^https:/, 'http:');
}
