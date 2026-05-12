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
import { esmImport } from '../../utils/esm-import';

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

export function getRecordedCalls(method?: string): RecordedSlackCall[] {
  if (!method) return [...recordedCalls];

  return recordedCalls.filter((c) => c.method === method);
}

export function clearRecordedCalls(): void {
  recordedCalls = [];
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
 *    `chat-sdk.service.ts`) gets `slackApiUrl` injected.
 * 2. **`WebClient.prototype.apiCall`** — mutates `slackApiUrl` and the
 *    underlying axios `baseURL` on every call. This catches WebClient
 *    instances that were constructed BEFORE the patch (e.g. cached on a
 *    `ChatSdkService.instances` entry surviving across test files), and is
 *    also our safety net if the constructor wrap somehow misses an instance.
 *
 * `WebClient` reads `slackApiUrl` once at construction to build axios's
 * `baseURL`, then `axios.getUri()` uses `this.axios.defaults.baseURL` per
 * request — so mutating both fields covers every Slack API call path.
 */
function patchWebClient(): void {
  if (webClientPatched) return;

  // biome-ignore lint/style/noCommonJs: deliberate require so we mutate module.exports before chat-adapter binds the named import
  const webApi = require('@slack/web-api') as {
    WebClient: new (token?: string, opts?: Record<string, unknown>) => unknown;
  };
  const Original = webApi.WebClient;

  function PatchedWebClient(this: unknown, token?: string, opts?: Record<string, unknown>) {
    const merged: Record<string, unknown> = { ...(opts ?? {}) };
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

      return origApiCall.apply(this, args);
    };
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
