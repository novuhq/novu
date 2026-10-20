import 'server-only';

import type { NextRequest } from 'next/server';

import { RELAY_AGENT_IDENTIFIER } from './human-agent-api';
import { API_PROXY_PATH, resolveNovuApiUrl } from './novu-api';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** A path of Agent Inbox's API, and the path on the Novu API it forwards to. */
type Route = readonly [method: Method, path: string, novuPath: string];

/**
 * The query parameter that names the agent a call is about, as on the rest of Agent Inbox's API. A Novu path
 * with `:agentIdentifier` in it takes it from there, or the default agent when it's left out.
 */
const AGENT_PARAM = 'agentIdentifier';

/**
 * Agent Inbox's API: what the CLI, the MCP server and the invite, verify and connect pages call, grouped like
 * the CLI's commands. A `:name` in a path stands for one part of it, and lands in the same place on the Novu
 * API. Nothing else on the Novu API can be reached through this site.
 */
const ROUTES: readonly Route[] = [
  // `inbox …` in the CLI; `inbox_*` and `wait` on the MCP server.
  ['GET', '/v1/inbox', '/v1/human/inbox'],
  ['POST', '/v1/inbox/messages', '/v1/human/interactions'],
  ['GET', '/v1/inbox/messages/:messageId', '/v1/human/interactions/:messageId'],
  ['GET', '/v1/inbox/:conversationId', '/v1/human/inbox/:conversationId'],
  ['POST', '/v1/inbox/:conversationId/read', '/v1/human/inbox/:conversationId/read'],
  ['POST', '/v1/inbox/:conversationId/resolve', '/v1/human/inbox/:conversationId/resolve'],

  // `contact …` in the CLI; `contacts` and `invite` on the MCP server.
  ['GET', '/v1/contacts', '/v1/human/contacts'],
  ['GET', '/v1/contacts/:contactId', '/v1/human/contacts/:contactId'],
  ['POST', '/v1/contacts/invites', '/v1/human/invites'],
  ['POST', '/v1/contacts/verifications', '/v1/human/verifications'],

  // `channel …` and `setup` in the CLI, and the connect page: Telegram, Slack and email for the agent.
  ['GET', '/v1/channels', '/v1/agents/:agentIdentifier/integrations'],
  ['POST', '/v1/channels', '/v1/agents/:agentIdentifier/integrations'],
  ['GET', '/v1/channels/apps', '/v1/integrations'],
  ['POST', '/v1/channels/apps', '/v1/integrations'],
  ['POST', '/v1/channels/apps/:appId/telegram-link', '/v1/integrations/:appId/mobile-link'],
  ['POST', '/v1/channels/apps/:appId/slack-quick-setup', '/v1/integrations/:appId/slack-quick-setup'],
  [
    'POST',
    '/v1/channels/apps/:appId/slack-setup-link',
    '/v1/agents/:agentIdentifier/integrations/:appId/slack/setup-link',
  ],
  ['GET', '/v1/channels/telegram/setup', '/v1/integrations/mobile-configure/status'],
  ['POST', '/v1/channels/telegram/setup', '/v1/integrations/mobile-configure'],
  ['POST', '/v1/channels/telegram/link', '/v1/integrations/channel-endpoints/link'],
  ['GET', '/v1/channels/links', '/v1/channel-endpoints'],
  ['POST', '/v1/channels/slack/install-link', '/v1/integrations/channel-connections/oauth'],
  ['GET', '/v1/channels/slack/setup', '/v1/agents/public/slack/setup/status'],
  ['POST', '/v1/channels/slack/setup', '/v1/agents/public/slack/setup'],

  // `setup`, `login` and `connect` in the CLI; the MCP server reads the operator too.
  ['POST', '/v1/setup', '/v1/human/setup'],
  ['POST', '/v1/setup/keyless', '/v1/inbox/session'],
  ['PUT', '/v1/agent/picture', '/v1/human/agent/picture'],
  ['POST', '/v1/login', '/v1/cli/device-sessions'],
  ['POST', '/v1/login/claim', '/v1/human/claim-token'],
  ['POST', '/v1/login/:deviceCode/poll', '/v1/cli/device-sessions/:deviceCode/poll'],
  ['GET', '/v1/operator', '/v1/human/operator'],
  ['POST', '/v1/connect', '/v1/human/connect'],

  // The pages people open from a link: an invite, an email check, and the agent's picture.
  ['GET', '/v1/invites/status', '/v1/human/invites/status'],
  ['POST', '/v1/invites/connect', '/v1/human/invites/connect'],
  ['POST', '/v1/invites/default', '/v1/human/invites/default'],
  ['POST', '/v1/invites/decline', '/v1/human/invites/decline'],
  ['POST', '/v1/verify', '/v1/human/verify'],
  ['POST', '/v1/verify-code', '/v1/human/verify-code'],
  [
    'GET',
    '/v1/agent-pictures/:environmentId/:agentId/:version',
    '/v1/human/agent-pictures/:environmentId/:agentId/:version',
  ],
];

/**
 * What the API reads from a request. Nothing else goes on: this site's cookies (the Clerk session above all),
 * and headers that would let a caller claim another IP address, stay here.
 */
const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'agent-inbox-via',
  'authorization',
  'content-type',
  'idempotency-key',
  'if-modified-since',
  'if-none-match',
  'novu-analytics-source',
  'novu-application-identifier',
  'user-agent',
];

const DROPPED_RESPONSE_HEADERS = new Set([
  // They describe the connection to the API, not the one to the caller.
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  // `fetch` hands the body over already decompressed, so its encoding and length no longer apply.
  'content-encoding',
  'content-length',
  // The API has no cookies to set on this site.
  'set-cookie',
]);

/**
 * Forwards a request to its path on the US Novu API (`ROUTES`): `/api/v1/inbox?wait=25` here is
 * `/v1/human/inbox?wait=25` there. The API's status, headers and body come back as they are, streamed, so a
 * held long-poll and a picture pass through unchanged.
 */
export async function forwardToNovuApi(request: NextRequest): Promise<Response> {
  const target = novuTarget(request);
  if (!target) {
    return Response.json({ statusCode: 404, message: 'Not Found' }, { status: 404 });
  }

  let response: Response;
  try {
    response = await fetch(`${resolveNovuApiUrl('us')}${target}`, {
      method: request.method,
      headers: forwardedHeaders(request),
      body: await readBody(request),
      redirect: 'manual',
      cache: 'no-store',
      // A caller that gives up (Ctrl-C on a long-poll) doesn't keep the API's request open.
      signal: request.signal,
    });
  } catch (error) {
    if (!request.signal.aborted) {
      console.error('Failed to reach the Novu API', error);
    }

    return Response.json(
      { statusCode: 502, message: 'Agent Inbox could not reach its API. Please try again.' },
      { status: 502 }
    );
  }

  const headers = new Headers();
  response.headers.forEach((value, name) => {
    if (!DROPPED_RESPONSE_HEADERS.has(name)) {
      headers.set(name, value);
    }
  });

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/** The request's path and query on the Novu API, or null when it isn't one of Agent Inbox's paths. */
function novuTarget(request: NextRequest): string | null {
  const { pathname, search, searchParams } = request.nextUrl;
  const parts = pathname.slice(API_PROXY_PATH.length).split('/');

  for (const [method, path, novuPath] of ROUTES) {
    const params = method === request.method ? matchPath(path.split('/'), parts) : null;
    if (!params) {
      continue;
    }

    if (!novuPath.includes(`:${AGENT_PARAM}`)) {
      return `${fillPath(novuPath, params)}${search}`;
    }

    // The agent moves from the query into the path, the way the Novu API takes it.
    params[AGENT_PARAM] = encodeURIComponent(searchParams.get(AGENT_PARAM) || RELAY_AGENT_IDENTIFIER);
    const query = new URLSearchParams(searchParams);
    query.delete(AGENT_PARAM);

    return `${fillPath(novuPath, params)}${query.size ? `?${query}` : ''}`;
  }

  return null;
}

/**
 * The parts a request's path has in place of a route's `:name`s, or null when it isn't that route. A part
 * keeps its encoding as it came in, so it reaches the Novu API the same.
 */
function matchPath(route: string[], parts: string[]): Record<string, string> | null {
  if (route.length !== parts.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (const [index, segment] of route.entries()) {
    if (segment.startsWith(':')) {
      if (!parts[index]) {
        return null;
      }

      params[segment.slice(1)] = parts[index];
    } else if (segment !== parts[index]) {
      return null;
    }
  }

  return params;
}

function fillPath(path: string, params: Record<string, string>): string {
  return path.replace(/:(\w+)/g, (_, name: string) => params[name]);
}

function forwardedHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) {
      headers.set(name, value);
    }
  }

  // The keyless limits count per IP address, so the API must see the caller's, not this site's.
  const clientIp = readClientIp(request);
  if (clientIp) {
    headers.set('x-forwarded-for', clientIp);
  }

  return headers;
}

/**
 * The caller's IP address. Vercel sets `x-forwarded-for` and `x-real-ip` itself and drops what the caller
 * sent, so on Vercel nobody can pass someone else's address through here.
 */
function readClientIp(request: NextRequest): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  return forwardedFor || request.headers.get('x-real-ip')?.trim() || undefined;
}

/** The request body, small enough to hold: JSON, or a picture of up to 2 MB. */
async function readBody(request: NextRequest): Promise<ArrayBuffer | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  const body = await request.arrayBuffer();

  return body.byteLength > 0 ? body : undefined;
}
