// A box's side of the Slack router (router.ts): what Box (host.ts) does for Novu Bot. Box calls it at its Slack
// hooks: `reset` when the container starts, `connect` on each alarm, `unregister` when the box is deleted, `env` for
// the box's environment, `state` for /__box/state, and `event` when the router hands the box an event. Without the
// router's settings (SLACK_ROUTER_URL) every hook does nothing, and boxes get no Slack.

import { Effect, Schema } from 'effect';
import { FetchHttpClient, HttpClient, HttpClientRequest } from 'effect/http';
import {
  type Phase,
  type SlackAgent,
  type SlackAnswer,
  SlackCredentials,
  type SlackEvent,
  type SlackEventNote,
} from '../../shared/contracts.ts';
import { boxOfOrigin } from '../../shared/names.ts';
import type { HostEnv } from '../env.ts';
import { type Failure, forget, log, messageOf, store, stored, within } from '../run.ts';

// What a call into the box (a command, its API) gets: a hung bridge or API mustn't stall the alarm.
const CALL_MS = 30 * 1000;
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
const Discovered = Schema.fromJsonString(Schema.Struct({ key: Schema.String, served: Schema.Array(Schema.String) }));

export class SlackFailed extends Schema.TaggedError<SlackFailed>()('SlackFailed', { message: Schema.String }) {}

// What BoxSlack needs from its Box.
export interface BoxHooks {
  readonly storage: DurableObjectStorage;
  readonly env: HostEnv;
  readonly running: () => boolean;
  readonly phase: () => Effect.Effect<Phase, Failure>;
  readonly wake: (origin: string) => Effect.Effect<void, Failure>;
  readonly output: (cmd: ReadonlyArray<string>) => Effect.Effect<string, Failure>;
  readonly port: () => Fetcher;
  readonly touch: () => void;
}

interface Listed<A> {
  readonly data: ReadonlyArray<A>;
}

export class BoxSlack {
  readonly #box: BoxHooks;
  readonly #enabled: boolean;
  #linked = new Set<string>();
  #apiKey: string | null = null;

  constructor(box: BoxHooks) {
    this.#box = box;
    this.#enabled = Boolean(box.env.SLACK_ROUTER_URL);
  }

  // SLACK_API_URL sends the box's Slack calls to the router, which swaps its fake tokens for the real one.
  env(): Record<string, string> {
    return this.#enabled ? { SLACK_API_URL: `${this.#box.env.SLACK_ROUTER_URL}/api/` } : {};
  }

  // The last Slack events the router handed to the box's agents, newest last.
  state(): Effect.Effect<{ slackEvents: ReadonlyArray<SlackEventNote> }> {
    return Effect.map(stored<Array<SlackEventNote>>(this.#box.storage, 'slackEvents'), (events) => ({
      slackEvents: events ?? [],
    }));
  }

  reset(): Effect.Effect<void> {
    return forget(this.#box.storage, 'slackConnected').pipe(
      Effect.andThen(
        Effect.sync(() => {
          this.#linked = new Set();
          this.#apiKey = null;
        })
      )
    );
  }

  unregister(): Effect.Effect<void> {
    const self = this;

    return Effect.gen(function* () {
      const origin = yield* stored<string>(self.#box.storage, 'origin');
      if (!self.#enabled || !origin) return;
      yield* Effect.tryPromise({
        try: () => self.#router().unregister(boxOfOrigin(origin)),
        catch: (error) => new SlackFailed({ message: messageOf(error) }),
      }).pipe(Effect.catch((error) => log(`slack: ${error.message}`)));
    });
  }

  // When the box is up, and again when the agents its bridge serves change (an apply): every one of them gets a
  // Slack integration, linked to it, with the signing secret and a bot token the router minted for this box, and a
  // workspace connection for Novu Bot's workspace. Then the router posts (or refreshes) the box's ready message in
  // #novu-box. It goes through the box's API from here, not from the box's own commands, because a box keeps the
  // commands of the snapshot it started from. A box started from another box's snapshot has that box's credentials
  // until this replaces them.
  connect(): Effect.Effect<void, Failure> {
    const self = this;
    const storage = this.#box.storage;

    return Effect.gen(function* () {
      if (!self.#enabled) return;
      const origin = yield* stored<string>(storage, 'origin');
      const output = yield* self.#box
        .output(['sh', '-c', 'test -f /data/.baked.json && node -e "$0"', DISCOVER])
        .pipe(within(CALL_MS, 'discover'));
      if (!origin || !output) return;
      const { key, served } = yield* Schema.decodeUnknownEffect(Discovered)(output);
      self.#apiKey = key;
      const api = <A>(path: string, init?: ApiInit) => self.#api<A>(origin, path, init);

      const box = boxOfOrigin(origin);
      // In storage: the Durable Object doesn't stay in memory between alarms.
      if (!served.length || [...served].sort().join(',') === (yield* stored<string>(storage, 'slackConnected'))) return;
      // An agent the bridge serves may not be in the API yet (a sync creates it); the next alarm connects it.
      const agents = (yield* api<Listed<{ identifier: string; _id: string }>>('/v1/agents?limit=50')).data.filter(
        (agent) => served.includes(agent.identifier)
      );
      const router = self.#router();
      const slack = yield* Effect.tryPromise({
        try: () =>
          router.register(
            box,
            origin,
            agents.map((agent) => agent.identifier)
          ),
        catch: (error) => new SlackFailed({ message: `register: ${messageOf(error)}` }),
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(SlackCredentials)));
      const integrations = (yield* api<Listed<{ identifier: string; _id: string }>>('/v1/integrations')).data;
      const ready: Array<SlackAgent> = [];
      for (const agent of agents) {
        const identifier = `box-slack-${agent.identifier}`;
        const credentials = { signingSecret: slack.signingSecret };
        const integration = integrations.find((item) => item.identifier === identifier);
        if (integration)
          yield* api(`/v1/integrations/${integration._id}`, { method: 'PUT', body: { credentials, check: false } });
        else
          yield* api('/v1/integrations', {
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
        yield* api(`/v1/agents/${agent.identifier}/integrations`, {
          method: 'POST',
          body: { integrationIdentifier: identifier },
        });
        const connection = {
          workspace: { id: slack.team.id, name: slack.team.name, botUserId: slack.botUserId },
          auth: { accessToken: slack.tokens[agent.identifier] },
        };
        const [existing] = (yield* api<Listed<{ identifier: string }>>(
          `/v1/channel-connections?integrationIdentifier=${identifier}`
        )).data;
        if (existing)
          yield* api(`/v1/channel-connections/${existing.identifier}`, { method: 'PATCH', body: connection });
        else
          yield* api('/v1/channel-connections', {
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
      yield* Effect.tryPromise({
        try: () => router.ready(box, ready),
        catch: (error) => new SlackFailed({ message: `ready: ${messageOf(error)}` }),
      });
      const connected = ready
        .map((agent) => agent.identifier)
        .sort()
        .join(',');
      yield* store(storage, 'slackConnected', connected);
      yield* log(`slack: ${box} connected ${connected}`);
    });
  }

  // The Slack router hands the box an event for one of its agents, signed with the box's secret, and gets the
  // agent's answer; null while the box is asleep (this wakes it), starting or saving, and the router tries again.
  // The bridge agents answer only people linked to a subscriber (subscriberAccess `restricted`), so a person's first
  // event links them to subscriber slack-<user> in the box, as a customer's app does with <ConnectChat>.
  event({ id, agent, user, headers, body, timeoutMs }: SlackEvent): Effect.Effect<SlackAnswer | null, Failure> {
    const self = this;
    const storage = this.#box.storage;

    return Effect.gen(function* () {
      self.#box.touch();
      const origin = (yield* stored<string>(storage, 'origin')) ?? '';
      const phase = yield* self.#box.phase();
      if (phase === 'saving') return null;
      if (!self.#box.running()) {
        if (phase === 'asleep') yield* self.#box.wake(origin);

        return null;
      }
      const integrationIdentifier = agent.integrationIdentifier;

      return yield* Effect.gen(function* () {
        if (user && !self.#linked.has(`${integrationIdentifier}:${user}`)) {
          yield* self.#api(origin, '/v1/channel-endpoints', {
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
          self.#linked.add(`${integrationIdentifier}:${user}`);
        }
        const webhook = `${insideOrigin(origin)}/v1/agents/${agent.id}/webhook/${integrationIdentifier}`;
        const request = HttpClientRequest.post(webhook).pipe(
          HttpClientRequest.setHeaders(headers),
          HttpClientRequest.bodyText(body, headers['content-type'] ?? 'application/json')
        );
        // A timeout interrupts the request, which aborts its fetch.
        const send = Effect.flatMap(HttpClient.HttpClient, (client) => client.execute(request));
        const response = yield* (timeoutMs ? send.pipe(within(timeoutMs, 'the agent')) : send).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.provideService(FetchHttpClient.Fetch, self.#fetch())
        );
        // From the box's proxy while the API restarts.
        if (response.status === 502 || response.status === 504) return null;
        const answer: SlackAnswer = {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          contentType: response.headers['content-type'] ?? 'application/json',
          text: yield* response.text,
        };
        const events = (yield* stored<Array<SlackEventNote>>(storage, 'slackEvents')) ?? [];
        events.push({ id, agent: agent.identifier, user, status: answer.status, at: new Date().toISOString() });
        yield* store(storage, 'slackEvents', events.slice(-20));

        return answer;
      }).pipe(
        Effect.catch((error) =>
          Effect.as(log(`slack: ${agent.identifier} isn't answering yet: ${error.message}`), null)
        )
      );
    });
  }

  #router() {
    return this.#box.env.ROUTER.get(this.#box.env.ROUTER.idFromName('router'));
  }

  // The box's port, as fetch for Effect's HttpClient.
  #fetch(): typeof globalThis.fetch {
    const port = this.#box.port();

    return (input, init) => port.fetch(input instanceof URL ? input.href : input, init);
  }

  // The box's own API over its port, with the environment's secret key. 409 counts as done: the thing exists.
  #api<A>(origin: string, path: string, init: ApiInit = {}): Effect.Effect<A, Failure> {
    const self = this;

    return Effect.gen(function* () {
      self.#apiKey ||= yield* self.#box
        .output(['cat', '/data/bridge/secret-key'])
        .pipe(within(CALL_MS, 'reading the API key'));
      const method = init.method ?? 'GET';
      let request = HttpClientRequest.make(method)(`${insideOrigin(origin)}${path}`).pipe(
        HttpClientRequest.setHeader('Authorization', `ApiKey ${self.#apiKey}`)
      );
      if (init.body) request = HttpClientRequest.bodyJsonUnsafe(request, init.body);
      const response = yield* Effect.flatMap(HttpClient.HttpClient, (client) => client.execute(request));
      const text = yield* response.text;
      if (response.status >= 300 && response.status !== 409)
        return yield* new SlackFailed({ message: `${method} ${path} -> ${response.status}: ${text.slice(0, 200)}` });

      return yield* Effect.try({
        try: () => (text ? JSON.parse(text) : null) as A,
        catch: () => new SlackFailed({ message: `${method} ${path} -> ${response.status}: not JSON` }),
      });
    }).pipe(
      within(CALL_MS, `${init.method ?? 'GET'} ${path}`),
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(FetchHttpClient.Fetch, this.#fetch())
    );
  }
}

interface ApiInit {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  readonly body?: unknown;
}

// The port speaks plain HTTP; the host stays the public one, which the API's URLs and Clerk check.
function insideOrigin(origin: string): string {
  return origin.replace(/^https:/, 'http:');
}
