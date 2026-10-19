import { getAgentByName } from 'agents';
import type { SessionObserver } from './session-observer';
import type { Env } from './types';
import { validateEnqueueParams, validateObservationParams } from './validation';

const encoder = new TextEncoder();

/** Workers add `timingSafeEqual` to `crypto.subtle`; the standard `SubtleCrypto` type lacks it. */
function hasTimingSafeEqual(
  subtle: SubtleCrypto
): subtle is SubtleCrypto & { timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean } {
  return 'timingSafeEqual' in subtle;
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength || !hasTimingSafeEqual(crypto.subtle)) return false;

  return crypto.subtle.timingSafeEqual(bufA, bufB);
}

function observer(env: Env, sessionId: string) {
  return getAgentByName<Env, SessionObserver>(env.SESSION_OBSERVER, sessionId);
}

async function handleEnqueue(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => undefined);
  if (!validateEnqueueParams(body)) {
    return Response.json(
      { error: 'Invalid params: sessionId, runId, turnId, provider, request, and webhook are required' },
      { status: 400 }
    );
  }
  const result = await (await observer(env, body.sessionId)).handleEnqueue(body);

  return Response.json(result, { status: 200 });
}

async function handleObserve(request: Request, env: Env): Promise<Response> {
  const body = await request.json().catch(() => undefined);
  if (!validateObservationParams(body)) {
    return Response.json(
      { error: 'Invalid params: sessionId, streamUrl, headers, provider, and webhook are required' },
      { status: 400 }
    );
  }
  await (await observer(env, body.sessionId)).startObserving(body);

  return new Response(null, { status: 204 });
}

async function handleStop(sessionId: string, env: Env): Promise<Response> {
  await (await observer(env, sessionId)).stopObserving();

  return new Response(null, { status: 204 });
}

async function handleLive(sessionId: string, url: URL, env: Env): Promise<Response> {
  const messageId = url.searchParams.get('messageId');
  if (!messageId) {
    return Response.json({ error: 'Invalid params: messageId is required' }, { status: 400 });
  }
  const stream = await (await observer(env, sessionId)).openLive(messageId);
  if (stream === 'unknown') {
    return new Response('No reply is being generated with this id', { status: 404 });
  }
  if (stream === 'busy') {
    return new Response('Another reader owns this reply', { status: 409 });
  }

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

function route(request: Request, env: Env, url: URL): Promise<Response> | Response {
  const { method } = request;
  const path = url.pathname;
  if (method === 'POST' && path === '/enqueue') return handleEnqueue(request, env);
  if (method === 'POST' && path === '/observe') return handleObserve(request, env);
  if (method === 'DELETE' && path.startsWith('/observe/')) {
    return handleStop(decodeURIComponent(path.slice('/observe/'.length)), env);
  }
  if (method === 'GET' && path.startsWith('/live/')) {
    return handleLive(decodeURIComponent(path.slice('/live/'.length)), url, env);
  }

  return new Response('Not found', { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      return new Response('WebSocket not supported — use webhook delivery', {
        status: 400,
      });
    }

    if (env.API_KEY && !timingSafeEqual(request.headers.get('Authorization') ?? '', `Bearer ${env.API_KEY}`)) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      return await route(request, env, url);
    } catch (err) {
      console.error('Worker request failed:', err);

      return new Response('Internal server error', { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
