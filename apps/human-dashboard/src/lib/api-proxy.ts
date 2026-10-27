import 'server-only';

import type { NextRequest } from 'next/server';

import { PROXY_ROUTES } from './api-proxy-routes';
import { RELAY_AGENT_IDENTIFIER } from './human-agent-api';
import { API_PROXY_PATH, resolveNovuApiUrl } from './novu-api';

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
const ROUTES = PROXY_ROUTES;

/**
 * What the API reads from a request. Nothing else goes on: this site's cookies (the Clerk session above all),
 * and headers that would let a caller claim another IP address, stay here.
 */
const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'agent-inbox-host',
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
