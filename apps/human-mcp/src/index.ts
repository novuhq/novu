import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { AuthError, authenticate, bearerTokenOf } from './auth';
import { clientNameOf, listConnections, recordConnection, toolOf } from './connections';
import { type Env, issuerOf } from './env';
import { createHumanApi } from './human-api';
import { registerTools } from './tools';

const SERVER = { name: 'human', version: '0.0.1' };
const DEFAULT_DOCS_URL = 'https://www.npmjs.com/package/@novu/human';
const RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource';
const CONNECTIONS_PATH = /^\/connections\/([^/]+)$/;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, WWW-Authenticate',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return withCors(await route(request, env, ctx));
  },
};

async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (url.pathname.startsWith(RESOURCE_METADATA_PATH)) {
    return resourceMetadata(url, env);
  }

  if (url.pathname.startsWith('/.well-known/oauth-authorization-server')) {
    return authorizationServerMetadata(env);
  }

  const connections = CONNECTIONS_PATH.exec(url.pathname);
  if (connections) {
    return connectionsOf(request, env, decodeURIComponent(connections[1]));
  }

  if (url.pathname !== '/' && url.pathname !== '/mcp') {
    return json({ error: 'not_found' }, 404);
  }

  // A person who opens the address in a browser wants to read about it, not to speak MCP.
  if (request.method === 'GET' && !bearerTokenOf(request) && request.headers.get('Accept')?.includes('text/html')) {
    return Response.redirect(env.DOCS_URL?.trim() || DEFAULT_DOCS_URL, 302);
  }

  try {
    return await serveMcp(request, env, ctx);
  } catch (error) {
    if (error instanceof AuthError) {
      return authFailure(error, url);
    }

    throw error;
  }
}

/** One request, one server: nothing is kept between calls, so any Worker instance can answer any of them. */
async function serveMcp(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const account = await authenticate(request, env);

  if (request.method === 'POST') {
    const tool = toolOf(
      clientNameOf(
        await request
          .clone()
          .json()
          .catch(() => null)
      )
    );
    if (tool) {
      ctx.waitUntil(recordConnection(env, account.humanUserId, tool));
    }
  }

  const server = new McpServer(SERVER, {
    instructions:
      'Human lets you reach a real person and wait for their answer. Use approve before anything that is hard to undo, ask when you need information only a person has, choose for a pick between options, and tell for news that needs no answer. When a result says the request is still open, call wait with its id; never go ahead without the answer.',
  });
  registerTools(server, createHumanApi(account));

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  return transport.handleRequest(request);
}

/** Tells a tool where to sign in: the Human Clerk app itself, so what it reads there is Clerk's own word. */
function resourceMetadata(url: URL, env: Env): Response {
  const issuer = issuerOf(env);
  if (!issuer) {
    return json({ error: 'sign_in_not_configured' }, 404);
  }

  return json({
    resource: url.origin,
    resource_name: 'Human',
    authorization_servers: [issuer],
    bearer_methods_supported: ['header'],
    scopes_supported: ['profile', 'email'],
  });
}

/** For tools that still look for the sign-in service on this address: Clerk's own description, unchanged. */
async function authorizationServerMetadata(env: Env): Promise<Response> {
  const issuer = issuerOf(env);
  if (!issuer) {
    return json({ error: 'sign_in_not_configured' }, 404);
  }

  const response = await fetch(`${issuer}/.well-known/oauth-authorization-server`);

  return response.ok ? json(await response.json()) : json({ error: 'sign_in_unavailable' }, 502);
}

function authFailure(error: AuthError, url: URL): Response {
  const headers: Record<string, string> =
    error.status === 401
      ? { 'WWW-Authenticate': `Bearer resource_metadata="${url.origin}${RESOURCE_METADATA_PATH}"` }
      : {};

  return json(
    { error: error.status === 401 ? 'unauthorized' : 'unavailable', message: error.message },
    error.status,
    headers
  );
}

/** For the Human dashboard's server only: which AI tools have signed in to an account. */
async function connectionsOf(request: Request, env: Env, humanUserId: string): Promise<Response> {
  const secret = env.HUMAN_DASHBOARD_API_SECRET;
  if (request.method !== 'GET' || !secret) {
    return json({ error: 'not_found' }, 404);
  }

  if (!(await sameSecret(request.headers.get('x-human-dashboard-secret') ?? '', secret))) {
    return json({ error: 'unauthorized' }, 401);
  }

  return json({ data: await listConnections(env, humanUserId) });
}

/** Compares digests, so how long the comparison takes says nothing about the secret. */
async function sameSecret(given: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all(
    [given, expected].map((value) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  );
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

function withCors(response: Response): Response {
  // A redirect's headers can't be changed, and a browser following one needs none of these.
  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS)) {
    headers.set(name, value);
  }

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
