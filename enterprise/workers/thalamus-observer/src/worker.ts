import type { SessionObserver } from './session-observer';
import type { Env } from './types';
import { validateEnqueueParams, validateObservationParams } from './validation';

const encoder = new TextEncoder();
const subtle = crypto.subtle as unknown as {
  timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean;
};

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;

  return subtle.timingSafeEqual(bufA, bufB);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health') {
      return Response.json({ status: 'ok' });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      return new Response('WebSocket not supported — use webhook delivery', {
        status: 400,
      });
    }

    if (env.API_KEY) {
      const auth = request.headers.get('Authorization') ?? '';
      if (!timingSafeEqual(auth, `Bearer ${env.API_KEY}`)) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    try {
      if (request.method === 'POST' && path === '/enqueue') {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        if (!validateEnqueueParams(body)) {
          return Response.json(
            { error: 'Invalid params: sessionId, runId, turnId, provider, request, and webhook are required' },
            { status: 400 }
          );
        }
        const stub = env.SESSION_OBSERVER.getByName(body.sessionId) as DurableObjectStub<SessionObserver>;
        const result = await stub.handleEnqueue(body);

        return Response.json(result, { status: 200 });
      }

      if (request.method === 'POST' && path === '/observe') {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        if (!validateObservationParams(body)) {
          return Response.json(
            { error: 'Invalid params: sessionId, streamUrl, headers, provider, and webhook are required' },
            { status: 400 }
          );
        }
        const stub = env.SESSION_OBSERVER.getByName(body.sessionId) as DurableObjectStub<SessionObserver>;
        await stub.startObserving(body);

        return new Response(null, { status: 204 });
      }

      if (request.method === 'DELETE' && path.startsWith('/observe/')) {
        const sessionId = decodeURIComponent(path.slice('/observe/'.length));
        const stub = env.SESSION_OBSERVER.getByName(sessionId) as DurableObjectStub<SessionObserver>;
        await stub.stopObserving();

        return new Response(null, { status: 204 });
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      console.error('Worker request failed:', err);

      return new Response('Internal server error', { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;
