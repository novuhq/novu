/**
 * Test infrastructure for routing the production Slack adapter at an in-process
 * Slack Web API mock (https://emulate.dev/slack), so the agent ↔ Slack contract
 * (chat.postMessage, chat.update, reactions.add, threading, Block Kit shapes)
 * gets full coverage without needing the real Slack API or a tunnel.
 *
 * Two pieces:
 *
 * 1. `startSlackEmulator()` boots an `emulate` Slack server on a free port and
 *    publishes its base URL via `process.env.SLACK_API_URL`. We use port 0 +
 *    `get-port` to avoid clashes when shards run in parallel.
 *
 * 2. `patchWebClient()` rewires `@slack/web-api`'s `WebClient` constructor to
 *    inject `slackApiUrl: process.env.SLACK_API_URL` whenever it's set. The
 *    production `@chat-adapter/slack` calls `new WebClient(botToken)` with no
 *    options (see `node_modules/@chat-adapter/slack/dist/index.js:775`), so the
 *    only knob we have to redirect every Slack call is the WebClient
 *    constructor itself. This MUST run before `@chat-adapter/slack` is first
 *    imported — the chat-sdk service loads the adapter lazily on the first
 *    inbound webhook / outbound reply, so calling `patchWebClient()` from a
 *    `before()` hook is sufficient.
 *
 * The emulator accepts any bearer token by default, which matches the fake
 * `xoxb-fake-bot-token-for-e2e` already seeded by `agent-test-setup.ts`.
 */

import getPort from 'get-port';
import { esmImport } from '../../shared/util/esm-import';

interface EmulatorInstance {
  url: string;
  reset(): void;
  close(): Promise<void>;
}

export interface RecordedSlackCall {
  method: string;
  options: Record<string, unknown>;
}

let emulator: EmulatorInstance | undefined;
let webClientPatched = false;
let recordedCalls: RecordedSlackCall[] = [];
const patchedWebClientPrototypes = new Set<object>();

/**
 * Synthetic Slack user records returned in place of real `users.info` lookups
 * for user ids the test fixtures inject (e.g. `<@UBOT>` in `buildSlackAppMention`).
 *
 * emulate.dev seeds users with auto-generated ids and exposes no way to pin a
 * specific user_id from the seed config, so `users.info({ user: 'UBOT' })`
 * against the emulator would otherwise return `user_not_found`. The
 * chat-adapter handles the failure gracefully but logs the full error stack
 * on every inbound message, which drowns real signals in CI output. Stub the
 * lookup result here instead so the adapter sees a clean response.
 */
const SYNTHETIC_USER_STUBS: Record<
  string,
  {
    ok: true;
    user: {
      id: string;
      team_id: string;
      name: string;
      real_name: string;
      is_bot: boolean;
      deleted: false;
      profile: {
        display_name: string;
        real_name: string;
        email: string;
        image_48: string;
        image_192: string;
      };
    };
  }
> = {
  UBOT: {
    ok: true,
    user: {
      id: 'UBOT',
      team_id: 'T000000001',
      name: 'novu-agent',
      real_name: 'Novu Agent',
      is_bot: true,
      deleted: false,
      profile: {
        display_name: 'novu-agent',
        real_name: 'Novu Agent',
        email: 'novu-agent@emulate.dev',
        image_48: '',
        image_192: '',
      },
    },
  },
};

export function getRecordedCalls(method?: string): RecordedSlackCall[] {
  if (!method) return [...recordedCalls];

  return recordedCalls.filter((c) => c.method === method);
}

export function clearRecordedCalls(): void {
  recordedCalls = [];
}

export interface SlackChannelSummary {
  id: string;
  name: string;
}

export interface SlackUserSummary {
  id: string;
  name: string;
}

export async function findEmulatorChannel(emulatorUrl: string, name: string): Promise<SlackChannelSummary> {
  const res = await fetch(`${emulatorUrl}/api/conversations.list`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Bearer xoxb-test',
    },
    body: '',
  });
  const body = (await res.json()) as { ok: boolean; channels?: SlackChannelSummary[] };

  if (!body.ok || !body.channels) {
    throw new Error(`Failed to list emulator channels: ${JSON.stringify(body)}`);
  }

  const channel = body.channels.find((c) => c.name === name);
  if (!channel) {
    throw new Error(`Channel "${name}" not seeded in emulator (have: ${body.channels.map((c) => c.name).join(', ')})`);
  }

  return channel;
}

export async function findEmulatorUser(emulatorUrl: string, email: string): Promise<SlackUserSummary> {
  const res = await fetch(`${emulatorUrl}/api/users.lookupByEmail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Bearer xoxb-test',
    },
    body: new URLSearchParams({ email }).toString(),
  });
  const body = (await res.json()) as { ok: boolean; user?: SlackUserSummary; error?: string };

  if (!body.ok || !body.user) {
    throw new Error(`Failed to look up emulator user "${email}": ${body.error ?? JSON.stringify(body)}`);
  }

  return body.user;
}

export async function startSlackEmulator(): Promise<EmulatorInstance> {
  if (emulator) return emulator;

  const port = await getPort();
  const { createEmulator } = (await esmImport('emulate')) as {
    createEmulator: (opts: {
      service: string;
      port?: number;
      seed?: Record<string, unknown>;
      baseUrl?: string;
    }) => Promise<EmulatorInstance>;
  };

  emulator = await createEmulator({
    service: 'slack',
    port,
    seed: {
      slack: {
        team: { name: 'Novu E2E', domain: 'novu-e2e' },
        users: [{ name: 'e2e-user', real_name: 'E2E User', email: 'e2e@novu.test' }],
        channels: [{ name: 'incidents', topic: 'P1 alerts' }],
        bots: [{ name: 'novu-agent' }],
      },
    },
  });

  process.env.SLACK_API_URL = `${emulator.url}/api`;
  patchWebClient();

  return emulator;
}

export async function stopSlackEmulator(): Promise<void> {
  if (!emulator) return;
  await emulator.close();
  emulator = undefined;
  delete process.env.SLACK_API_URL;
}

export function getEmulatorUrl(): string {
  if (!emulator) {
    throw new Error('Slack emulator not started. Call startSlackEmulator() first.');
  }

  return emulator.url;
}

export function resetEmulator(): void {
  emulator?.reset();
}

/**
 * Rewires `@slack/web-api`'s `WebClient` so every Slack API call goes to the
 * emulator URL stored in `process.env.SLACK_API_URL` rather than Slack's real
 * API. Idempotent and a no-op once applied.
 *
 * We patch in two places to be robust against import-order surprises:
 *
 * 1. **`module.exports.WebClient`** — wraps the constructor so any
 *    `new WebClient(token)` call constructed AFTER this patch (the typical
 *    case, since `@chat-adapter/slack` is lazy-imported in
 *    `chat-instance.registry.ts`) gets `slackApiUrl` injected.
 * 2. **`WebClient.prototype.apiCall`** — mutates `slackApiUrl` and the
 *    underlying axios `baseURL` on every call. This catches WebClient
 *    instances that were constructed BEFORE the patch (e.g. cached on a
 *    `ChatInstanceRegistry.instances` entry surviving across test files), and is
 *    also our safety net if the constructor wrap somehow misses an instance.
 *
 * `WebClient` reads `slackApiUrl` once at construction to build axios's
 * `baseURL`, then `axios.getUri()` uses `this.axios.defaults.baseURL` per
 * request — so mutating both fields covers every Slack API call path.
 *
 * `@chat-adapter/slack` resolves its own copy of `@slack/web-api` (e.g. 7.15.0)
 * while `apps/api` may depend on a newer direct version (e.g. 7.17.0). We patch
 * every resolved copy so the emulator redirect + synthetic stubs apply to the
 * WebClient instance the adapter actually constructs.
 */
function collectSlackWebApiModules(): Array<{
  WebClient: new (token?: string, opts?: Record<string, unknown>) => unknown;
}> {
  const modules: Array<{
    WebClient: new (token?: string, opts?: Record<string, unknown>) => unknown;
  }> = [];
  const seen = new Set<string>();

  function tryAdd(resolveFrom: string): void {
    try {
      const { createRequire } = require('node:module') as typeof import('node:module');
      const req = createRequire(resolveFrom);
      const resolved = req.resolve('@slack/web-api');
      if (seen.has(resolved)) return;
      seen.add(resolved);
      modules.push(
        req('@slack/web-api') as {
          WebClient: new (token?: string, opts?: Record<string, unknown>) => unknown;
        }
      );
    } catch {
      // not installed from this resolution context
    }
  }

  tryAdd(__filename);
  try {
    tryAdd(require.resolve('../../../../../package.json', { paths: [__filename] }));
  } catch {
    // apps/api package.json not found from this helper path
  }

  return modules;
}

function applyWebClientPatch(webApi: {
  WebClient: new (token?: string, opts?: Record<string, unknown>) => unknown;
}): void {
  const Original = webApi.WebClient;
  if (patchedWebClientPrototypes.has(Original.prototype)) return;
  patchedWebClientPrototypes.add(Original.prototype);

  function PatchedWebClient(this: unknown, token?: string, opts?: Record<string, unknown>) {
    const baseOpts = opts ?? {};
    const merged: Record<string, unknown> = {
      ...baseOpts,
      retryConfig: {
        ...(typeof baseOpts.retryConfig === 'object' && baseOpts.retryConfig !== null
          ? (baseOpts.retryConfig as Record<string, unknown>)
          : {}),
        retries: 0,
      },
    };
    const apiUrl = process.env.SLACK_API_URL;
    if (apiUrl && merged.slackApiUrl === undefined) {
      merged.slackApiUrl = apiUrl;
    }

    type ConstructorTarget = new (...args: unknown[]) => unknown;
    const newTarget = new.target as unknown;
    const target = (newTarget ?? PatchedWebClient) as ConstructorTarget;

    return Reflect.construct(Original, [token, merged], target);
  }

  PatchedWebClient.prototype = Original.prototype;
  Object.setPrototypeOf(PatchedWebClient, Original);

  // `@slack/web-api`'s CJS export defines `WebClient` as a getter via
  // `Object.defineProperty(exports, 'WebClient', { get: ... })` to support
  // ESM tree-shaking, so plain `webApi.WebClient = …` throws a TypeError.
  // Redefining the descriptor as a writable data property both swaps in our
  // patched constructor and lets later code (re-)assign it if needed.
  Object.defineProperty(webApi, 'WebClient', {
    value: PatchedWebClient as unknown as typeof Original,
    writable: true,
    configurable: true,
    enumerable: true,
  });

  type WebClientInstance = {
    slackApiUrl?: string;
    axios?: { defaults?: { baseURL?: string } };
  };

  const proto = Original.prototype as { apiCall?: (...args: unknown[]) => unknown };
  const origApiCall = proto.apiCall;
  if (typeof origApiCall === 'function') {
    proto.apiCall = function patchedApiCall(this: WebClientInstance, ...args: unknown[]) {
      const apiUrl = process.env.SLACK_API_URL;
      if (apiUrl) {
        const normalized = apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
        if (this.slackApiUrl !== normalized) {
          this.slackApiUrl = normalized;
        }
        if (this.axios?.defaults && this.axios.defaults.baseURL !== normalized) {
          this.axios.defaults.baseURL = normalized;
        }
      }

      // Record every Slack API call for assertions on the wire payload — the
      // emulator only persists a subset of fields (e.g. `chat.postMessage`
      // drops `blocks`), so test that need fidelity on what was sent must
      // assert against what the production adapter handed off to the
      // WebClient, not against what the emulator stored.
      const [method, options] = args as [string, Record<string, unknown> | undefined];
      recordedCalls.push({ method, options: { ...(options ?? {}) } });

      // Short-circuit `users.info` lookups for the synthetic user ids the test
      // fixtures inject into inbound app_mention payloads (e.g. `UBOT`).
      // emulate.dev seeds users with auto-generated ids only, so the
      // chat-adapter's `resolveInlineMentions` → `users.info({ user: 'UBOT' })`
      // would otherwise hit `user_not_found` and log a noisy stack on every
      // inbound message. Returning a synthetic ok response keeps the
      // mention-resolution path quiet without changing the production wire
      // contract — the recorded payload above still captures the real call.
      if (method === 'users.info' && options && typeof (options as { user?: unknown }).user === 'string') {
        const stub = SYNTHETIC_USER_STUBS[(options as { user: string }).user];
        if (stub) {
          return Promise.resolve(stub);
        }
      }

      // chat-adapter@4.28.1+ posts markdown replies with the `markdown_text`
      // payload key instead of `text`. The emulate.dev slack module only
      // persists `body.text` for chat.postMessage / chat.update, so without
      // this shim the stored message ends up with empty text and `text === ...`
      // assertions on `conversations.replies` / `conversations.history` fail.
      // Mirror `markdown_text` into `text` for the wire payload so the
      // emulator stores something useful while leaving the recorded payload
      // (above) intact for fidelity assertions.
      if (
        (method === 'chat.postMessage' || method === 'chat.update') &&
        options &&
        typeof options === 'object' &&
        typeof (options as { markdown_text?: unknown }).markdown_text === 'string' &&
        typeof (options as { text?: unknown }).text !== 'string'
      ) {
        const shimmed = {
          ...(options as Record<string, unknown>),
          text: (options as { markdown_text: string }).markdown_text,
        };

        return origApiCall.apply(this, [method, shimmed, ...args.slice(2)] as unknown[]);
      }

      return origApiCall.apply(this, args);
    };
  }
}

function patchWebClient(): void {
  if (webClientPatched) return;

  for (const webApi of collectSlackWebApiModules()) {
    applyWebClientPatch(webApi);
  }

  webClientPatched = true;
}

interface SlackMessage {
  type: string;
  user?: string;
  bot_id?: string;
  text?: string;
  ts: string;
  thread_ts?: string;
  blocks?: Array<Record<string, unknown>>;
}

interface SlackHistoryResponse {
  ok: boolean;
  messages?: SlackMessage[];
  error?: string;
}

interface SlackRepliesResponse {
  ok: boolean;
  messages?: SlackMessage[];
  error?: string;
}

interface SlackReactionsResponse {
  ok: boolean;
  message?: { reactions?: Array<{ name: string; count: number; users: string[] }> };
  error?: string;
}

async function postForm(path: string, body: Record<string, string>, token = 'xoxb-test'): Promise<Response> {
  return fetch(`${getEmulatorUrl()}/api/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${token}`,
    },
    body: new URLSearchParams(body).toString(),
  });
}

export async function getChannelHistory(channel: string, token = 'xoxb-test'): Promise<SlackHistoryResponse> {
  const res = await postForm('conversations.history', { channel }, token);

  return (await res.json()) as SlackHistoryResponse;
}

export async function getThreadReplies(
  channel: string,
  ts: string,
  token = 'xoxb-test'
): Promise<SlackRepliesResponse> {
  const res = await postForm('conversations.replies', { channel, ts }, token);

  return (await res.json()) as SlackRepliesResponse;
}

export async function getReactionsForMessage(
  channel: string,
  ts: string,
  token = 'xoxb-test'
): Promise<SlackReactionsResponse> {
  const res = await postForm('reactions.get', { channel, timestamp: ts }, token);

  return (await res.json()) as SlackReactionsResponse;
}
