import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.NEXT_PUBLIC_NOVU_BACKEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const FORWARD_RESPONSE_HEADERS = ['content-type', 'cache-control'];

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const jwt = req.headers.get('x-mcp-jwt');
  const environmentId = req.headers.get('x-mcp-environment-id');

  if (!jwt) {
    return NextResponse.json(
      { message: 'Missing x-mcp-jwt header. Sign in to Clerk in the playground first.' },
      { status: 401 }
    );
  }

  const { path } = await ctx.params;
  const upstreamPath = path.map(encodeURIComponent).join('/');
  const url = new URL(req.url);
  const upstreamUrl = `${BACKEND_URL}/${upstreamPath}${url.search}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
  };
  // `Novu-Environment-Id` is required for env-scoped routes (e.g. /v1/agents)
  // but must be omitted for org-scoped routes (e.g. /v1/environments) — the
  // upstream JWT strategy unconditionally treats the header as a Mongo ObjectId
  // and will throw a CastError on any non-empty placeholder.
  if (environmentId) {
    headers['Novu-Environment-Id'] = environmentId;
  }

  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const text = await req.text();
    if (text) {
      body = text;
      const contentType = req.headers.get('content-type');
      headers['Content-Type'] = contentType ?? 'application/json';
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: `Failed to reach Novu API at ${BACKEND_URL}: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  for (const headerName of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(headerName);
    if (value) {
      responseHeaders.set(headerName, value);
    }
  }

  const bodyBuffer = await upstream.arrayBuffer();

  return new NextResponse(bodyBuffer, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx);
}
